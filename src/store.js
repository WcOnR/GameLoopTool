const KEY = 'gameloop_v3'

export const EMPTY = { objects: [], loops: [] }

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const saved = JSON.parse(raw)
    return {
      ...saved,
      objects: (saved.objects || []).map(o => ({
        ...o,
        attrs: (o.attrs || []).map(a => a.type === 'object' ? { ...a, type: 'string' } : a),
      })),
    }
  } catch {
    return EMPTY
  }
}

export function saveState(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export const newId = () => crypto.randomUUID()

// ── Objects ─────────────────────────────────────────────────────
export function addObject(s) {
  return { ...s, objects: [...s.objects, { id: newId(), name: 'New Object', attrs: [], actions: [] }] }
}

export function updateObject(s, id, patch) {
  return { ...s, objects: s.objects.map(o => o.id === id ? { ...o, ...patch } : o) }
}

export function deleteObject(s, id) {
  const obj = s.objects.find(o => o.id === id)
  const actionIds = new Set((obj?.actions || []).map(a => a.id))

  const loops = s.loops.map(loop => {
    const removedNodeIds = new Set(
      loop.nodes
        .filter(n => (n.refType === 'object' && n.refId === id) || (n.refType === 'action' && actionIds.has(n.refId)))
        .map(n => n.id)
    )
    if (removedNodeIds.size === 0) return loop
    const nodes = loop.nodes.filter(n => !removedNodeIds.has(n.id))
    const edges = loop.edges.filter(e => !removedNodeIds.has(e.fromLoopNodeId) && !removedNodeIds.has(e.toLoopNodeId))
    return { ...loop, nodes, edges }
  })

  return { ...s, objects: s.objects.filter(o => o.id !== id), loops }
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

// ── Actions (nested under object, just { id, name }) ─────────────
export function addAction(s, objectId) {
  return {
    ...s,
    objects: s.objects.map(o =>
      o.id === objectId
        ? { ...o, actions: [...(o.actions || []), { id: newId(), name: 'action' }] }
        : o
    ),
  }
}

export function updateAction(s, objectId, actionId, patch) {
  return {
    ...s,
    objects: s.objects.map(o =>
      o.id === objectId
        ? { ...o, actions: (o.actions || []).map(a => a.id === actionId ? { ...a, ...patch } : a) }
        : o
    ),
  }
}

export function deleteAction(s, objectId, actionId) {
  const loops = s.loops.map(loop => {
    const removedNodeIds = new Set(
      loop.nodes.filter(n => n.refType === 'action' && n.refId === actionId).map(n => n.id)
    )
    if (removedNodeIds.size === 0) return loop
    const nodes = loop.nodes.filter(n => !removedNodeIds.has(n.id))
    const edges = loop.edges.filter(e => !removedNodeIds.has(e.fromLoopNodeId) && !removedNodeIds.has(e.toLoopNodeId))
    return { ...loop, nodes, edges }
  })

  return {
    ...s,
    objects: s.objects.map(o =>
      o.id === objectId ? { ...o, actions: (o.actions || []).filter(a => a.id !== actionId) } : o
    ),
    loops,
  }
}

// ── Loops ────────────────────────────────────────────────────────
export function addLoop(s) {
  return { ...s, loops: [...s.loops, { id: newId(), name: 'New Loop', nodes: [], localEvents: [], localActions: [], edges: [] }] }
}

export function updateLoop(s, loopId, patch) {
  return { ...s, loops: s.loops.map(l => l.id === loopId ? { ...l, ...patch } : l) }
}

export function deleteLoop(s, loopId) {
  return { ...s, loops: s.loops.filter(l => l.id !== loopId) }
}

// ── Loop nodes ───────────────────────────────────────────────────
export function addLoopNode(s, loopId, refType, refId) {
  return {
    ...s,
    loops: s.loops.map(l =>
      l.id === loopId
        ? { ...l, nodes: [...l.nodes, { id: newId(), refType, refId }] }
        : l
    ),
  }
}

export function removeLoopNode(s, loopId, nodeId) {
  return {
    ...s,
    loops: s.loops.map(l => {
      if (l.id !== loopId) return l
      const node = l.nodes.find(n => n.id === nodeId)
      const isLocalAction = node?.refType === 'action' && (l.localActions || []).some(a => a.id === node.refId)
      return {
        ...l,
        nodes: l.nodes.filter(n => n.id !== nodeId),
        edges: l.edges.filter(e => e.fromLoopNodeId !== nodeId && e.toLoopNodeId !== nodeId),
        localEvents: node?.refType === 'event'
          ? l.localEvents.filter(e => e.id !== node.refId)
          : l.localEvents,
        localActions: isLocalAction
          ? (l.localActions || []).filter(a => a.id !== node.refId)
          : (l.localActions || []),
      }
    }),
  }
}

export function updateLoopNodePosition(s, loopId, nodeId, x, y) {
  return {
    ...s,
    loops: s.loops.map(l =>
      l.id === loopId
        ? { ...l, nodes: l.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n) }
        : l
    ),
  }
}

// ── Local events ─────────────────────────────────────────────────
export function addLocalEvent(s, loopId) {
  const eventId = newId()
  return {
    ...s,
    loops: s.loops.map(l => {
      if (l.id !== loopId) return l
      return {
        ...l,
        localEvents: [...l.localEvents, { id: eventId, name: 'New Event' }],
        nodes: [...l.nodes, { id: newId(), refType: 'event', refId: eventId }],
      }
    }),
  }
}

export function updateLocalEvent(s, loopId, eventId, patch) {
  return {
    ...s,
    loops: s.loops.map(l =>
      l.id === loopId
        ? { ...l, localEvents: l.localEvents.map(e => e.id === eventId ? { ...e, ...patch } : e) }
        : l
    ),
  }
}

export function deleteLocalEvent(s, loopId, eventId) {
  return {
    ...s,
    loops: s.loops.map(l => {
      if (l.id !== loopId) return l
      const removedNodeIds = new Set(
        l.nodes.filter(n => n.refType === 'event' && n.refId === eventId).map(n => n.id)
      )
      const nodes = l.nodes.filter(n => !removedNodeIds.has(n.id))
      const edges = l.edges.filter(e => !removedNodeIds.has(e.fromLoopNodeId) && !removedNodeIds.has(e.toLoopNodeId))
      return { ...l, localEvents: l.localEvents.filter(e => e.id !== eventId), nodes, edges }
    }),
  }
}

// ── Local actions ─────────────────────────────────────────────────
export function addLocalAction(s, loopId, objectId) {
  const actionId = newId()
  return {
    ...s,
    loops: s.loops.map(l =>
      l.id === loopId
        ? {
            ...l,
            localActions: [...(l.localActions || []), { id: actionId, name: 'action', objectId }],
            nodes: [...l.nodes, { id: newId(), refType: 'action', refId: actionId }],
          }
        : l
    ),
  }
}

export function updateLocalAction(s, loopId, actionId, patch) {
  return {
    ...s,
    loops: s.loops.map(l =>
      l.id === loopId
        ? { ...l, localActions: (l.localActions || []).map(a => a.id === actionId ? { ...a, ...patch } : a) }
        : l
    ),
  }
}

export function deleteLocalAction(s, loopId, actionId) {
  return {
    ...s,
    loops: s.loops.map(l => {
      if (l.id !== loopId) return l
      const removedNodeIds = new Set(
        l.nodes.filter(n => n.refType === 'action' && n.refId === actionId).map(n => n.id)
      )
      return {
        ...l,
        localActions: (l.localActions || []).filter(a => a.id !== actionId),
        nodes: l.nodes.filter(n => !removedNodeIds.has(n.id)),
        edges: l.edges.filter(e => !removedNodeIds.has(e.fromLoopNodeId) && !removedNodeIds.has(e.toLoopNodeId)),
      }
    }),
  }
}

// ── Loop edges ───────────────────────────────────────────────────
export function addLoopEdge(s, loopId, fromLoopNodeId = '') {
  return {
    ...s,
    loops: s.loops.map(l =>
      l.id === loopId
        ? { ...l, edges: [...l.edges, { id: newId(), fromLoopNodeId, toLoopNodeId: '', condition: null, effect: null }] }
        : l
    ),
  }
}

export function updateLoopEdge(s, loopId, edgeId, patch) {
  return {
    ...s,
    loops: s.loops.map(l =>
      l.id === loopId
        ? { ...l, edges: l.edges.map(e => e.id === edgeId ? { ...e, ...patch } : e) }
        : l
    ),
  }
}

export function deleteLoopEdge(s, loopId, edgeId) {
  return {
    ...s,
    loops: s.loops.map(l =>
      l.id === loopId ? { ...l, edges: l.edges.filter(e => e.id !== edgeId) } : l
    ),
  }
}
