const KEY = 'gameloop_v2'

export const EMPTY = { objects: [], actions: [], events: [] }

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
  const obj = s.objects.find(o => o.id === id)
  const attrIds = new Set(obj ? obj.attrs.map(a => a.id) : [])

  const actions = s.actions
    .filter(a => a.objectId !== id)
    .map(a => ({
      ...a,
      effect: a.effect?.targetObjectId === id ? null : a.effect,
      edges: a.edges.map(e => ({
        ...e,
        effect: e.effect?.targetObjectId === id ? null : e.effect,
      })),
    }))

  const events = s.events.map(evt => ({
    ...evt,
    triggers: evt.triggers.filter(t => t.objectId !== id),
    edges: evt.edges
      .filter(e => !attrIds.has(e.toAttrId))
      .map(e => ({ ...e, effect: e.effect?.targetObjectId === id ? null : e.effect })),
  }))

  return { ...s, objects: s.objects.filter(o => o.id !== id), actions, events }
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
  const events = s.events.map(evt => ({
    ...evt,
    edges: evt.edges.filter(e => e.toAttrId !== attrId),
  }))
  return {
    ...s,
    objects: s.objects.map(o =>
      o.id === objectId ? { ...o, attrs: o.attrs.filter(a => a.id !== attrId) } : o
    ),
    events,
  }
}

// ── Actions ──────────────────────────────────────────────────────
export function addAction(s, objectId) {
  return {
    ...s,
    actions: [...s.actions, { id: newId(), name: 'action', objectId, effect: null, edges: [] }],
  }
}

export function updateAction(s, id, patch) {
  return { ...s, actions: s.actions.map(a => a.id === id ? { ...a, ...patch } : a) }
}

export function deleteAction(s, id) {
  return { ...s, actions: s.actions.filter(a => a.id !== id) }
}

// ── Action edges ─────────────────────────────────────────────────
export function addActionEdge(s, actionId) {
  return {
    ...s,
    actions: s.actions.map(a =>
      a.id === actionId
        ? { ...a, edges: [...a.edges, { id: newId(), toEventId: '', effect: null }] }
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
  return { ...s, events: [...s.events, { id: newId(), name: 'New Event', triggers: [], edges: [] }] }
}

export function updateEvent(s, id, patch) {
  return { ...s, events: s.events.map(e => e.id === id ? { ...e, ...patch } : e) }
}

export function deleteEvent(s, id) {
  const actions = s.actions.map(a => ({
    ...a,
    edges: a.edges.filter(e => e.toEventId !== id),
  }))
  return { ...s, events: s.events.filter(e => e.id !== id), actions }
}

// ── Event edges ──────────────────────────────────────────────────
export function addEventEdge(s, eventId) {
  return {
    ...s,
    events: s.events.map(e =>
      e.id === eventId
        ? { ...e, edges: [...e.edges, { id: newId(), toAttrId: '', effect: null }] }
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

// ── Triggers ─────────────────────────────────────────────────────
export function addTrigger(s, eventId) {
  return {
    ...s,
    events: s.events.map(e =>
      e.id === eventId
        ? { ...e, triggers: [...e.triggers, { id: newId(), objectId: '', attrId: '', condition: '<', value: 0 }] }
        : e
    ),
  }
}

export function updateTrigger(s, eventId, triggerId, patch) {
  return {
    ...s,
    events: s.events.map(e =>
      e.id === eventId
        ? { ...e, triggers: e.triggers.map(t => t.id === triggerId ? { ...t, ...patch } : t) }
        : e
    ),
  }
}

export function deleteTrigger(s, eventId, triggerId) {
  return {
    ...s,
    events: s.events.map(e =>
      e.id === eventId ? { ...e, triggers: e.triggers.filter(t => t.id !== triggerId) } : e
    ),
  }
}
