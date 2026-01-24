//! Intention queue for offline support.
//!
//! When the Avatar is offline, intentions are queued locally and
//! sent when the connection is restored.

use std::collections::VecDeque;

use ub_core::Timestamp;
use ub_protocol::Term;

/// A queued intention.
#[derive(Debug, Clone)]
pub struct QueuedIntention {
    /// Unique ID for this queued intention.
    pub id: String,
    /// Intent name.
    pub intent: String,
    /// Intent parameters.
    pub params: Vec<Term>,
    /// When the intention was queued.
    pub queued_at: Timestamp,
    /// Number of send attempts.
    pub attempts: u32,
    /// Last attempt timestamp.
    pub last_attempt: Option<Timestamp>,
}

/// Queue for storing intentions when offline.
#[derive(Debug, Default)]
pub struct IntentionQueue {
    /// Pending intentions.
    queue: VecDeque<QueuedIntention>,
    /// Maximum queue size.
    max_size: usize,
    /// Maximum retry attempts.
    max_attempts: u32,
}

impl IntentionQueue {
    /// Create a new intention queue.
    pub fn new(max_size: usize, max_attempts: u32) -> Self {
        Self {
            queue: VecDeque::new(),
            max_size,
            max_attempts,
        }
    }

    /// Add an intention to the queue.
    ///
    /// Returns `false` if the queue is full.
    pub fn enqueue(
        &mut self,
        id: String,
        intent: String,
        params: Vec<Term>,
        now: Timestamp,
    ) -> bool {
        if self.queue.len() >= self.max_size {
            return false;
        }

        self.queue.push_back(QueuedIntention {
            id,
            intent,
            params,
            queued_at: now,
            attempts: 0,
            last_attempt: None,
        });

        true
    }

    /// Get the next intention to send.
    pub fn peek(&self) -> Option<&QueuedIntention> {
        self.queue.front()
    }

    /// Mark the front intention as attempted.
    pub fn mark_attempted(&mut self, now: Timestamp) {
        if let Some(intention) = self.queue.front_mut() {
            intention.attempts += 1;
            intention.last_attempt = Some(now);
        }
    }

    /// Remove the front intention (successfully sent).
    pub fn dequeue(&mut self) -> Option<QueuedIntention> {
        self.queue.pop_front()
    }

    /// Remove an intention by ID.
    pub fn remove(&mut self, id: &str) -> Option<QueuedIntention> {
        if let Some(pos) = self.queue.iter().position(|i| i.id == id) {
            self.queue.remove(pos)
        } else {
            None
        }
    }

    /// Check if an intention has exceeded max attempts.
    pub fn should_drop(&self, intention: &QueuedIntention) -> bool {
        intention.attempts >= self.max_attempts
    }

    /// Get the number of queued intentions.
    pub fn len(&self) -> usize {
        self.queue.len()
    }

    /// Check if the queue is empty.
    pub fn is_empty(&self) -> bool {
        self.queue.is_empty()
    }

    /// Check if the queue is full.
    pub fn is_full(&self) -> bool {
        self.queue.len() >= self.max_size
    }

    /// Clear all queued intentions.
    pub fn clear(&mut self) {
        self.queue.clear();
    }

    /// Get all queued intentions.
    pub fn all(&self) -> impl Iterator<Item = &QueuedIntention> {
        self.queue.iter()
    }

    /// Remove and return intentions that have exceeded max attempts.
    pub fn drain_failed(&mut self) -> Vec<QueuedIntention> {
        let mut failed = Vec::new();
        let max = self.max_attempts;

        self.queue.retain(|i| {
            if i.attempts >= max {
                failed.push(i.clone());
                false
            } else {
                true
            }
        });

        failed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_queue_basic_operations() {
        let mut queue = IntentionQueue::new(10, 3);
        let now = Timestamp::now();

        assert!(queue.is_empty());

        // Enqueue
        assert!(queue.enqueue("1".to_string(), "test".to_string(), vec![], now));
        assert_eq!(queue.len(), 1);

        // Peek
        let peeked = queue.peek().unwrap();
        assert_eq!(peeked.id, "1");

        // Dequeue
        let dequeued = queue.dequeue().unwrap();
        assert_eq!(dequeued.id, "1");
        assert!(queue.is_empty());
    }

    #[test]
    fn test_queue_max_size() {
        let mut queue = IntentionQueue::new(2, 3);
        let now = Timestamp::now();

        assert!(queue.enqueue("1".to_string(), "test".to_string(), vec![], now));
        assert!(queue.enqueue("2".to_string(), "test".to_string(), vec![], now));
        assert!(!queue.enqueue("3".to_string(), "test".to_string(), vec![], now)); // Full!

        assert!(queue.is_full());
    }
}
