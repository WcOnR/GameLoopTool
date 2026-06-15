const KEY = 'gameloop_v3'

export const EMPTY = { objects: [], actions: [], events: [], objectEventEdges: [] }

export function loadState() {
  localStorage.clear()
  return EMPTY
}

export function saveState(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export const newId = () => crypto.randomUUID()

// ── Objects ─────────────────────────────────────────────────────
export function addObject(s) {
  return { ...s, objects: [...s.objects, { id: newId(), name: 'New Object', attrs: [] }] }
}

export function updateObject(s, id, patch) {
  return { ...s, objects: s.objects.map(o => o.id === id ? { ...o, ...patch } : o) }
}

export function deleteObject(s, id) {
  const cleanEdge = e => ({
    ...e,
    effect: e.effect?.targetObjectId === id ? null : e.effect,
    condition: e.condition?.objectId === id ? null : e.condition,
  })

  const actions = s.actions
    .filter(a => a.objectId !== id)
    .map(a => ({
      ...a,
      effect: a.effect?.targetObjectId === id ? null : a.effect,
      condition: a.condition?.objectId === id ? null : a.condition,
      edges: a.edges.map(cleanEdge),
    }))

  const events = s.events.map(evt => ({
    ...evt,
    edges: evt.edges.filter(e => e.toObjectId !== id).map(cleanEdge),
  }))

  const objectEventEdges = s.objectEventEdges
    .filter(e => e.fromObjectId !== id && e.condition?.objectId !== id)
    .map(cleanEdge)

  return { ...s, objects: s.objects.filter(o => o.id !== id), actions, events, objectEventEdges }
}

// ── Attrs ────────────────────────────────────────────────────────
export function addAttr(s, objectId) {
  return {
    ...s,
    objects: s.objects.map(o =>
      o.id === objectId
        ? { ...o, attrs: [...o.attrs, { id: newId(), name: 'attr', type: 'number', value: 0 }] }
        : o
    ),
  }
}

export function updateAttr(s, objectId, attrId, patch) {
  return {
    ...s,
    objects: s.objects.map(o =>
      o.id === objectId
        ? { ...o, attrs: o.attrs.map(a => a.id === attrId ? { ...a, ...patch } : a) }
        : o
    ),
  }
}

export function deleteAttr(s, objectId, attrId) {
  return {
    ...s,
    objects: s.objects.map(o =>
      o.id === objectId ? { ...o, attrs: o.attrs.filter(a => a.id !== attrId) } : o
    ),
  }
}

// ── Actions ──────────────────────────────────────────────────────
export function addAction(s, objectId) {
  return {
    ...s,
    actions: [
      ...s.actions,
      { id: newId(), name: 'action', objectId, effect: null, condition: null, edges: [] },
    ],
  }
}

export function updateAction(s, id, patch) {
  return { ...s, actions: s.actions.map(a => a.id === id ? { ...a, ...patch } : a) }
}

export function deleteAction(s, id) {
  return { ...s, actions: s.actions.filter(a => a.id !== id) }
}

// ── Action edges (→ Event) ───────────────────────────────────────
export function addActionEdge(s, actionId) {
  return {
    ...s,
    actions: s.actions.map(a =>
      a.id === actionId
        ? { ...a, edges: [...a.edges, { id: newId(), toEventId: '', condition: null, effect: null }] }
        : a
    ),
  }
}

export function updateActionEdge(s, actionId, edgeId, patch) {
  return {
    ...s,
    actions: s.actions.map(a =>
      a.id === actionId
        ? { ...a, edges: a.edges.map(e => e.id === edgeId ? { ...e, ...patch } : e) }
        : a
    ),
  }
}

export function deleteActionEdge(s, actionId, edgeId) {
  return {
    ...s,
    actions: s.actions.map(a =>
      a.id === actionId ? { ...a, edges: a.edges.filter(e => e.id !== edgeId) } : a
    ),
  }
}

// ── Events ───────────────────────────────────────────────────────
export function addEvent(s) {
  return { ...s, events: [...s.events, { id: newId(), name: 'New Event', edges: [] }] }
}

export function updateEvent(s, id, patch) {
  return { ...s, events: s.events.map(e => e.id === id ? { ...e, ...patch } : e) }
}

export function deleteEvent(s, id) {
  const actions = s.actions.map(a => ({
    ...a,
    edges: a.edges.filter(e => e.toEventId !== id),
  }))
  const objectEventEdges = s.objectEventEdges.filter(e => e.toEventId !== id)
  return { ...s, events: s.events.filter(e => e.id !== id), actions, objectEventEdges }
}

// ── Event edges (→ Object) ───────────────────────────────────────
export function addEventEdge(s, eventId) {
  return {
    ...s,
    events: s.events.map(e =>
      e.id === eventId
        ? { ...e, edges: [...e.edges, { id: newId(), toObjectId: '', condition: null, effect: null }] }
        : e
    ),
  }
}

export function updateEventEdge(s, eventId, edgeId, patch) {
  return {
    ...s,
    events: s.events.map(e =>
      e.id === eventId
        ? { ...e, edges: e.edges.map(ed => ed.id === edgeId ? { ...ed, ...patch } : ed) }
        : e
    ),
  }
}

export function deleteEventEdge(s, eventId, edgeId) {
  return {
    ...s,
    events: s.events.map(e =>
      e.id === eventId ? { ...e, edges: e.edges.filter(ed => ed.id !== edgeId) } : e
    ),
  }
}

// ── Object → Event edges ─────────────────────────────────────────
export function addObjectEventEdge(s, fromObjectId) {
  return {
    ...s,
    objectEventEdges: [
      ...s.objectEventEdges,
      { id: newId(), fromObjectId, toEventId: '', condition: null, effect: null },
    ],
  }
}

export function updateObjectEventEdge(s, id, patch) {
  return {
    ...s,
    objectEventEdges: s.objectEventEdges.map(e => e.id === id ? { ...e, ...patch } : e),
  }
}

export function deleteObjectEventEdge(s, id) {
  return {
    ...s,
    objectEventEdges: s.objectEventEdges.filter(e => e.id !== id),
  }
}
