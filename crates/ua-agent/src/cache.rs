//! Local memory cache.
//!
//! The Avatar maintains a local cache of memory events received from the Agent.
//! This module provides:
//! - Event storage and retrieval
//! - Event deduplication
//! - Derived views and projections

use std::collections::HashMap;

use ub_core::Cursor;
use ub_protocol::Term;

/// A cached event from memory.
#[derive(Debug, Clone)]
pub struct CachedEvent {
    /// Event cursor.
    pub cursor: Cursor,
    /// Event type.
    pub event_type: String,
    /// Event data as Term.
    pub data: Term,
}

/// Local memory cache.
///
/// Stores events received from the Agent and provides query capabilities.
#[derive(Debug, Default)]
pub struct MemoryCache {
    /// Events by cursor sequence.
    events: HashMap<u64, CachedEvent>,
    /// Latest cursor seen.
    latest_cursor: Cursor,
    /// Facts indexed by predicate name.
    facts_by_predicate: HashMap<String, Vec<Term>>,
}

impl MemoryCache {
    /// Create a new empty cache.
    pub fn new() -> Self {
        Self::default()
    }

    /// Get the latest cursor.
    pub fn latest_cursor(&self) -> Cursor {
        self.latest_cursor
    }

    /// Add an event to the cache.
    ///
    /// Returns true if the event was added (not a duplicate).
    pub fn add_event(&mut self, cursor: Cursor, event_type: String, data: Term) -> bool {
        let seq = cursor.sequence();

        // Deduplicate by cursor
        if self.events.contains_key(&seq) {
            return false;
        }

        // Index facts by predicate
        if let Some(predicate) = extract_predicate(&data) {
            self.facts_by_predicate
                .entry(predicate)
                .or_default()
                .push(data.clone());
        }

        // Update latest cursor
        if cursor > self.latest_cursor {
            self.latest_cursor = cursor;
        }

        self.events.insert(
            seq,
            CachedEvent {
                cursor,
                event_type,
                data,
            },
        );

        true
    }

    /// Get an event by cursor sequence.
    pub fn get_event(&self, cursor_seq: u64) -> Option<&CachedEvent> {
        self.events.get(&cursor_seq)
    }

    /// Get all events in cursor order.
    pub fn all_events(&self) -> Vec<&CachedEvent> {
        let mut seqs: Vec<_> = self.events.keys().collect();
        seqs.sort();
        seqs.into_iter().filter_map(|s| self.events.get(s)).collect()
    }

    /// Get facts by predicate name.
    pub fn get_facts(&self, predicate: &str) -> Vec<&Term> {
        self.facts_by_predicate
            .get(predicate)
            .map(|v| v.iter().collect())
            .unwrap_or_default()
    }

    /// Query facts matching a pattern.
    ///
    /// Simple pattern matching - returns facts where the predicate matches.
    pub fn query(&self, predicate: &str) -> Vec<&Term> {
        self.get_facts(predicate)
    }

    /// Get the total number of events.
    pub fn event_count(&self) -> usize {
        self.events.len()
    }

    /// Clear all cached events.
    pub fn clear(&mut self) {
        self.events.clear();
        self.facts_by_predicate.clear();
        self.latest_cursor = Cursor::default();
    }

    /// Check if a cursor has been seen.
    pub fn has_cursor(&self, cursor_seq: u64) -> bool {
        self.events.contains_key(&cursor_seq)
    }
}

/// Extract the predicate name from a fact term.
fn extract_predicate(term: &Term) -> Option<String> {
    match term {
        Term::Compound { functor, .. } => Some(functor.clone()),
        Term::Atom(s) => Some(s.clone()),
        _ => None,
    }
}

/// A derived view that automatically updates when underlying facts change.
#[derive(Debug)]
pub struct DerivedView {
    /// View name.
    pub name: String,
    /// Source predicate to watch.
    pub source_predicate: String,
    /// Cached items.
    items: Vec<Term>,
}

impl DerivedView {
    /// Create a new derived view.
    pub fn new(name: String, source_predicate: String) -> Self {
        Self {
            name,
            source_predicate,
            items: Vec::new(),
        }
    }

    /// Update the view from the cache.
    pub fn update(&mut self, cache: &MemoryCache) {
        self.items = cache
            .get_facts(&self.source_predicate)
            .into_iter()
            .cloned()
            .collect();
    }

    /// Get the current items.
    pub fn items(&self) -> &[Term] {
        &self.items
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_deduplication() {
        let mut cache = MemoryCache::new();

        assert!(cache.add_event(
            Cursor::at(1),
            "test".to_string(),
            Term::Atom("fact1".to_string())
        ));

        // Same cursor should be deduplicated
        assert!(!cache.add_event(
            Cursor::at(1),
            "test".to_string(),
            Term::Atom("fact2".to_string())
        ));

        assert_eq!(cache.event_count(), 1);
    }
}
