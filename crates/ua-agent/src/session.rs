//! Agent session management.
//!
//! An `AgentSession` represents a connection to a single Agent.
//! It handles:
//! - Connection lifecycle (connect, disconnect, reconnect)
//! - Message framing and parsing
//! - Cursor tracking and event deduplication
//! - Resume token management

use std::collections::HashSet;

use crate::agent_card::AgentDossier;
use ua_core::{AvatarError, Clock, Random, Result, Storage, Transport};
use ub_core::{Cursor, Timestamp};
use ub_protocol::{Frame, Headers, Term};

/// State of an Agent session.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionState {
    /// Not connected.
    Disconnected,
    /// Connection initiated, waiting for transport.
    Connecting,
    /// Transport connected, JOIN sent, waiting for WELCOME.
    Joining,
    /// WELCOME received, syncing memory.
    Syncing,
    /// Fully ready for operations.
    Ready,
    /// Gracefully leaving.
    Leaving,
    /// Error state.
    Error,
}

/// Configuration for an Agent session.
#[derive(Debug, Clone)]
pub struct SessionConfig {
    /// Agent address to connect to (e.g., "acme.billing").
    pub agent_id: String,
    /// WebSocket endpoint URL.
    pub endpoint: String,
    /// Avatar ID (session-based by default).
    pub avatar_id: Option<String>,
    /// Resume token from previous session.
    pub resume_token: Option<String>,
    /// Ping interval in milliseconds.
    pub ping_interval_ms: u64,
    /// Connection timeout in milliseconds.
    pub connect_timeout_ms: u64,
    /// Maximum reconnect attempts.
    pub max_reconnect_attempts: u32,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            agent_id: String::new(),
            endpoint: String::new(),
            avatar_id: None,
            resume_token: None,
            ping_interval_ms: 30_000,
            connect_timeout_ms: 10_000,
            max_reconnect_attempts: 5,
        }
    }
}

/// A session with an Agent.
///
/// Each `AgentSession` represents a connection to a single agent.
/// The Avatar can maintain multiple sessions for multi-agent support.
pub struct AgentSession<T, S, C, R>
where
    T: Transport,
    S: Storage,
    C: Clock,
    R: Random,
{
    /// Session configuration.
    config: SessionConfig,
    /// Current state.
    state: SessionState,
    /// Transport for WebSocket communication.
    transport: T,
    /// Storage for persistence.
    #[allow(dead_code)]
    storage: S,
    /// Clock for timestamps.
    clock: C,
    /// Random for ID generation.
    random: R,
    /// Agent agent_card (received in WELCOME).
    agent_card: Option<AgentDossier>,
    /// Current cursor position.
    cursor: Cursor,
    /// Resume token for reconnection.
    resume_token: Option<String>,
    /// Set of seen event cursors (for deduplication).
    #[allow(dead_code)]
    seen_cursors: HashSet<u64>,
    /// Pending message ID (for tracking responses).
    #[allow(dead_code)]
    pending_message_id: Option<String>,
    /// Last ping timestamp.
    #[allow(dead_code)]
    last_ping: Option<Timestamp>,
    /// Last pong timestamp.
    #[allow(dead_code)]
    last_pong: Option<Timestamp>,
}

impl<T, S, C, R> AgentSession<T, S, C, R>
where
    T: Transport,
    S: Storage,
    C: Clock,
    R: Random,
{
    /// Create a new session with the given platform implementations.
    pub fn new(config: SessionConfig, transport: T, storage: S, clock: C, random: R) -> Self {
        Self {
            config,
            state: SessionState::Disconnected,
            transport,
            storage,
            clock,
            random,
            agent_card: None,
            cursor: Cursor::default(),
            resume_token: None,
            seen_cursors: HashSet::new(),
            pending_message_id: None,
            last_ping: None,
            last_pong: None,
        }
    }

    /// Get the current session state.
    pub fn state(&self) -> SessionState {
        self.state
    }

    /// Get the agent agent_card (available after WELCOME).
    pub fn agent_card(&self) -> Option<&AgentDossier> {
        self.agent_card.as_ref()
    }

    /// Get the current cursor position.
    pub fn cursor(&self) -> Cursor {
        self.cursor
    }

    /// Check if the session is ready for operations.
    pub fn is_ready(&self) -> bool {
        self.state == SessionState::Ready
    }

    /// Connect to the Agent.
    pub async fn connect(&mut self) -> Result<()> {
        if self.state != SessionState::Disconnected {
            return Err(AvatarError::Session("Already connected or connecting".into()));
        }

        self.state = SessionState::Connecting;

        // Connect transport
        self.transport.connect(&self.config.endpoint).await?;

        self.state = SessionState::Joining;

        // Send JOIN message
        let join_msg = self.build_join_frame();
        self.send_frame(&join_msg).await?;

        Ok(())
    }

    /// Disconnect from the Agent gracefully.
    pub async fn disconnect(&mut self) -> Result<()> {
        if self.state == SessionState::Disconnected {
            return Ok(());
        }

        self.state = SessionState::Leaving;

        // Send LEAVE message
        let leave_msg = self.build_leave_frame();
        let _ = self.send_frame(&leave_msg).await;

        // Close transport
        self.transport.disconnect().await?;

        self.state = SessionState::Disconnected;
        Ok(())
    }

    /// Send an intention to the Agent.
    pub async fn send_intention(&mut self, intent: &str, params: Vec<Term>) -> Result<String> {
        if !self.is_ready() {
            return Err(AvatarError::NotConnected);
        }

        let message_id = self.random.message_id().to_string();
        let intention_frame = self.build_intention_frame(&message_id, intent, params);

        self.pending_message_id = Some(message_id.clone());
        self.send_frame(&intention_frame).await?;

        Ok(message_id)
    }

    /// Acknowledge events up to the given cursor.
    pub async fn acknowledge(&mut self, cursor: Cursor) -> Result<()> {
        if !self.is_ready() {
            return Err(AvatarError::NotConnected);
        }

        let ack_frame = self.build_ack_frame(cursor);
        self.send_frame(&ack_frame).await?;

        self.cursor = cursor;
        Ok(())
    }

    /// Send a ping to keep the connection alive.
    pub async fn ping(&mut self) -> Result<()> {
        if !self.transport.is_connected() {
            return Err(AvatarError::NotConnected);
        }

        let ping_frame = self.build_ping_frame();
        self.send_frame(&ping_frame).await?;

        self.last_ping = Some(self.clock.now_millis());
        Ok(())
    }

    /// Process an incoming message.
    pub async fn receive(&mut self) -> Result<Option<IncomingMessage>> {
        let frame = self.transport.receive().await?;
        self.process_frame(frame).await
    }

    // --- Private methods ---

    async fn send_frame(&mut self, frame: &Frame) -> Result<()> {
        self.transport.send(frame.clone()).await
    }

    async fn process_frame(&mut self, frame: Frame) -> Result<Option<IncomingMessage>> {
        let msg_type = frame.headers.get("type").unwrap_or("");

        match msg_type.to_lowercase().as_str() {
            "welcome" => {
                self.handle_welcome(&frame)?;
                Ok(Some(IncomingMessage::Welcome))
            }
            "memory" => {
                self.handle_memory(&frame)?;
                Ok(Some(IncomingMessage::Memory))
            }
            "decision" => {
                let decision = self.handle_decision(&frame)?;
                Ok(Some(IncomingMessage::Decision(decision)))
            }
            "presence" => {
                let participants = self.handle_presence(&frame)?;
                Ok(Some(IncomingMessage::Presence(participants)))
            }
            "pong" => {
                self.last_pong = Some(self.clock.now_millis());
                Ok(Some(IncomingMessage::Pong))
            }
            "error" => {
                let (code, message) = self.handle_error(&frame)?;
                Err(AvatarError::Session(format!("{}: {}", code, message)))
            }
            _ => {
                tracing::warn!("Unknown message type: {}", msg_type);
                Ok(None)
            }
        }
    }

    fn handle_welcome(&mut self, frame: &Frame) -> Result<()> {
        // Parse agent agent_card from WELCOME body
        if let Some(body) = &frame.body {
            // Try to parse body as Term
            if let Ok(term) = ub_protocol::parse_term(body) {
                self.agent_card = Some(AgentDossier::from_term(&term)?);
            }
        }

        // Extract resume token from headers
        if let Some(token) = frame.headers.get("resume") {
            self.resume_token = Some(token.to_string());
        }

        // Extract cursor from headers
        if let Some(cursor_str) = frame.headers.get("cursor") {
            if let Ok(cursor_val) = cursor_str.parse::<u64>() {
                self.cursor = Cursor::at(cursor_val);
            }
        }

        self.state = SessionState::Syncing;
        Ok(())
    }

    fn handle_memory(&mut self, frame: &Frame) -> Result<()> {
        // Update cursor if provided
        if let Some(cursor_end) = frame.headers.get("cursor_end") {
            if let Ok(cursor_val) = cursor_end.parse::<u64>() {
                self.cursor = Cursor::at(cursor_val);

                // Mark as ready after first memory sync
                if self.state == SessionState::Syncing {
                    self.state = SessionState::Ready;
                }
            }
        }

        Ok(())
    }

    fn handle_decision(&mut self, frame: &Frame) -> Result<Decision> {
        Ok(Decision {
            intention_id: frame
                .headers
                .get("reply")
                .map(|s| s.to_string())
                .unwrap_or_default(),
            status: DecisionStatus::Accepted,
            reason: None,
            facts: Vec::new(),
            view_instructions: Vec::new(),
        })
    }

    fn handle_presence(&mut self, _frame: &Frame) -> Result<Vec<Participant>> {
        Ok(Vec::new())
    }

    fn handle_error(&mut self, frame: &Frame) -> Result<(String, String)> {
        let code = frame
            .headers
            .get("code")
            .map(|s| s.to_string())
            .unwrap_or_else(|| "unknown".to_string());
        let message = frame
            .body
            .clone()
            .unwrap_or_else(|| "Error from Agent".to_string());
        Ok((code, message))
    }

    fn build_join_frame(&self) -> Frame {
        let avatar_id = self
            .config
            .avatar_id
            .clone()
            .unwrap_or_else(|| self.random.avatar_id());

        let avatar_address = format!("uhum://avatar:{}/{}", self.config.agent_id, avatar_id);

        let mut headers = Headers::new();
        headers.set("type", "join");
        headers.set("id", self.random.message_id().to_string());
        headers.set("from", avatar_address);
        headers.set("to", format!("uhum://{}", self.config.agent_id));
        headers.set("at", self.clock.now_millis().as_millis().to_string());

        if let Some(ref token) = self.config.resume_token {
            headers.set("resume", token.clone());
        }

        let body = "join([capabilities([memory_sync, intentions])])."
            .to_string();

        Frame::new(headers).with_body(body)
    }

    fn build_leave_frame(&self) -> Frame {
        let mut headers = Headers::new();
        headers.set("type", "leave");
        headers.set("id", self.random.message_id().to_string());
        headers.set("at", self.clock.now_millis().as_millis().to_string());

        Frame::new(headers).with_body("leave.".to_string())
    }

    fn build_intention_frame(&self, message_id: &str, intent: &str, params: Vec<Term>) -> Frame {
        let mut headers = Headers::new();
        headers.set("type", "intention");
        headers.set("id", message_id);
        headers.set("at", self.clock.now_millis().as_millis().to_string());

        // Build body as Term string
        let params_str: Vec<String> = params.iter().map(|t| t.to_string()).collect();
        let body = format!(
            "intention({}, [{}], context([])).",
            intent,
            params_str.join(", ")
        );

        Frame::new(headers).with_body(body)
    }

    fn build_ack_frame(&self, cursor: Cursor) -> Frame {
        let mut headers = Headers::new();
        headers.set("type", "ack");
        headers.set("id", self.random.message_id().to_string());
        headers.set("cursor", cursor.sequence().to_string());
        headers.set("at", self.clock.now_millis().as_millis().to_string());

        Frame::new(headers).with_body("ack.".to_string())
    }

    fn build_ping_frame(&self) -> Frame {
        let mut headers = Headers::new();
        headers.set("type", "ping");
        headers.set("id", self.random.message_id().to_string());
        headers.set("at", self.clock.now_millis().as_millis().to_string());

        Frame::new(headers).with_body("ping.".to_string())
    }
}

/// Incoming message types.
#[derive(Debug)]
pub enum IncomingMessage {
    /// WELCOME received.
    Welcome,
    /// MEMORY with events.
    Memory,
    /// DECISION response.
    Decision(Decision),
    /// PRESENCE update.
    Presence(Vec<Participant>),
    /// PONG response.
    Pong,
}

/// A decision response from the Agent.
#[derive(Debug, Clone)]
pub struct Decision {
    /// Original intention ID.
    pub intention_id: String,
    /// Decision status.
    pub status: DecisionStatus,
    /// Reason (for rejections).
    pub reason: Option<String>,
    /// Facts returned with the decision.
    pub facts: Vec<Term>,
    /// View instructions for the Avatar.
    pub view_instructions: Vec<Term>,
}

/// Decision status.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DecisionStatus {
    /// Intention was accepted and executed.
    Accepted,
    /// Intention was rejected.
    Rejected,
    /// Intention is pending (async processing).
    Pending,
}

/// A participant in the session (for presence).
#[derive(Debug, Clone)]
pub struct Participant {
    /// Participant ID.
    pub id: String,
    /// Participant type (e.g., "avatar", "agent").
    pub participant_type: String,
}
