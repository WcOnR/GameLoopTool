import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'

cytoscape.use(dagre)

function findEmptySpot(existing) {
  const clearance = 150
  if (existing.length === 0) return { x: 200, y: 200 }
  const cx = existing.reduce((s, p) => s + p.x, 0) / existing.length
  const cy = existing.reduce((s, p) => s + p.y, 0) / existing.length
  for (let r = clearance; r < 3000; r += clearance) {
    const steps = Math.max(8, Math.floor((2 * Math.PI * r) / clearance))
    for (let i = 0; i < steps; i++) {
      const angle = (2 * Math.PI * i) / steps
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      if (existing.every(p => Math.hypot(p.x - x, p.y - y) >= clearance)) return { x, y }
    }
  }
  return { x: cx + clearance * 2, y: cy }
}

// Build edge label from optional effect + condition
function edgeLabel(edge, state) {
  const effectPart = (() => {
    if (!edge.effect?.targetObjectId) return ''
    const obj = state.objects.find(o => o.id === edge.effect.targetObjectId)
    const attr = obj?.attrs.find(a => a.id === edge.effect.targetAttrId)
    return obj && attr ? `[${obj.name}:${attr.name}] ${edge.effect.delta}` : ''
  })()

  const condPart = (() => {
    if (!edge.condition?.objectId) return ''
    const obj = state.objects.find(o => o.id === edge.condition.objectId)
    const attr = obj?.attrs.find(a => a.id === edge.condition.attrId)
    return obj && attr
      ? `if ${obj.name}:${attr.name} ${edge.condition.operator} ${edge.condition.value}`
      : ''
  })()

  if (effectPart && condPart) return `${effectPart} | ${condPart}`
  return effectPart || condPart
}

function buildElements(state) {
  const nodes = []
  const edges = []

  for (const obj of state.objects) {
    const attrLines = obj.attrs.map(a => `${a.name}: ${a.value}`).join('\n')
    const el = {
      data: { id: obj.id, label: obj.name + (attrLines ? '\n' + attrLines : ''), kind: 'object', entityId: obj.id },
    }
    if (obj.x !== undefined && obj.y !== undefined) el.position = { x: obj.x, y: obj.y }
    nodes.push(el)
  }

  for (const action of state.actions) {
    const el = { data: { id: action.id, label: action.name, kind: 'action', entityId: action.id } }
    if (action.x !== undefined && action.y !== undefined) el.position = { x: action.x, y: action.y }
    nodes.push(el)

    // Object → Action
    edges.push({
      data: {
        id: `oa-${action.id}`,
        source: action.objectId,
        target: action.id,
        label: edgeLabel({ effect: action.effect, condition: action.condition }, state),
      },
    })

    // Action → Event
    for (const edge of action.edges) {
      if (!edge.toEventId) continue
      edges.push({
        data: { id: `ae-${edge.id}`, source: action.id, target: edge.toEventId, label: edgeLabel(edge, state) },
      })
    }
  }

  for (const evt of state.events) {
    const el = { data: { id: evt.id, label: evt.name, kind: 'event', entityId: evt.id } }
    if (evt.x !== undefined && evt.y !== undefined) el.position = { x: evt.x, y: evt.y }
    nodes.push(el)

    // Event → Object
    for (const edge of evt.edges) {
      if (!edge.toObjectId) continue
      edges.push({
        data: { id: `eo-${edge.id}`, source: evt.id, target: edge.toObjectId, label: edgeLabel(edge, state) },
      })
    }
  }

  // Object → Event (objectEventEdges)
  for (const edge of state.objectEventEdges) {
    if (!edge.fromObjectId || !edge.toEventId) continue
    edges.push({
      data: { id: `oee-${edge.id}`, source: edge.fromObjectId, target: edge.toEventId, label: edgeLabel(edge, state) },
    })
  }

  const nodeIds = new Set(nodes.map(n => n.data.id))
  return { nodes, edges: edges.filter(e => nodeIds.has(e.data.source) && nodeIds.has(e.data.target)) }
}

const STYLE = [
  {
    selector: 'node[kind="object"]',
    style: {
      shape: 'rectangle', 'background-color': '#4a6fa5', 'border-color': '#2d4f7c', 'border-width': 2,
      color: '#ddeeff', label: 'data(label)', 'text-valign': 'center', 'text-halign': 'center',
      'text-wrap': 'wrap', 'font-size': 11, padding: '10px', 'min-zoomed-font-size': 6,
    },
  },
  {
    selector: 'node[kind="action"]',
    style: {
      shape: 'polygon', 'shape-polygon-points': '-0.75 -1 1 -1 0.75 1 -1 1',
      'background-color': '#2d8c6e', 'border-color': '#1a5c48', 'border-width': 2,
      color: '#ccffee', label: 'data(label)', 'text-valign': 'center', 'text-halign': 'center',
      'font-size': 11, padding: '8px', 'min-zoomed-font-size': 6,
    },
  },
  {
    selector: 'node[kind="event"]',
    style: {
      shape: 'roundrectangle', 'background-color': '#c47d1a', 'border-color': '#8a5510', 'border-width': 2,
      color: '#fff3cc', label: 'data(label)', 'text-valign': 'center', 'text-halign': 'center',
      'font-size': 11, padding: '8px', 'min-zoomed-font-size': 6,
    },
  },
  { selector: 'node.highlighted', style: { 'border-color': '#ffdd44', 'border-width': 3 } },
  {
    selector: 'edge',
    style: {
      width: 1.5, 'line-color': '#3a5a7a', 'target-arrow-color': '#3a5a7a',
      'target-arrow-shape': 'triangle', 'curve-style': 'bezier',
      label: 'data(label)', 'font-size': 9, color: '#8ab',
      'text-background-color': '#0a0a18', 'text-background-opacity': 0.85, 'text-background-padding': '2px',
    },
  },
]

export default function GraphView({ state, selectedId, onSelectEntity, onPositionChange, fitCounter, panTo }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const onPositionChangeRef = useRef(onPositionChange)
  useEffect(() => { onPositionChangeRef.current = onPositionChange }, [onPositionChange])

  useEffect(() => {
    if (!containerRef.current) return
    const cy = cytoscape({
      container: containerRef.current, elements: [], style: STYLE,
      layout: { name: 'preset' }, userZoomingEnabled: true, userPanningEnabled: true, boxSelectionEnabled: false,
    })
    cy.on('tap', 'node', evt => {
      const entityId = evt.target.data('entityId')
      if (entityId) onSelectEntity(entityId)
    })
    cy.on('dragfree', 'node', evt => {
      const node = evt.target
      const { x, y } = node.position()
      onPositionChangeRef.current(node.id(), node.data('kind'), x, y)
    })
    cyRef.current = cy
    return () => { cy.destroy(); cyRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const { nodes, edges } = buildElements(state)
    cy.elements().remove()
    if (nodes.length === 0) return

    const unpositioned = nodes.filter(n => !n.position)
    const existingPositions = nodes.filter(n => n.position).map(n => ({ ...n.position }))

    for (const node of unpositioned) {
      const pos = findEmptySpot(existingPositions)
      node.position = pos
      existingPositions.push({ ...pos })
    }

    cy.add([...nodes, ...edges])
    cy.layout({ name: 'preset', animate: false, fit: false }).run()

    if (unpositioned.length > 0) {
      for (const node of unpositioned) {
        onPositionChangeRef.current(node.data.id, node.data.kind, node.position.x, node.position.y)
      }
      const newIds = new Set(unpositioned.map(n => n.data.id))
      const newCyNodes = cy.nodes().filter(n => newIds.has(n.id()))
      if (newCyNodes.length > 0) cy.animate({ center: { eles: newCyNodes }, duration: 300 })
    }
  }, [state])

  useEffect(() => {
    if (!fitCounter) return
    const cy = cyRef.current
    if (cy) cy.fit(cy.elements(), 40)
  }, [fitCounter])

  useEffect(() => {
    if (!panTo?.id) return
    const cy = cyRef.current
    if (!cy) return
    const node = cy.getElementById(panTo.id)
    if (node.length > 0) cy.animate({ center: { eles: node }, duration: 300 })
  }, [panTo])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.nodes().removeClass('highlighted')
    if (selectedId) cy.nodes().filter(n => n.data('entityId') === selectedId).addClass('highlighted')
  }, [selectedId, state])

  const isEmpty = state.objects.length === 0 && state.events.length === 0

  return (
    <div className="graph-panel">
      <div id="cy" ref={containerRef} />
      {isEmpty && <div className="graph-placeholder">Add an object or event to get started</div>}
    </div>
  )
}
