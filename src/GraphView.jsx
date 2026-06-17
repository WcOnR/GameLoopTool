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

function nodeSize(label) {
  const lines = label.split('\n')
  const longest = Math.max(...lines.map(l => l.length))
  const w = Math.max(80, longest * 4 + 4)
  const h = Math.max(40, lines.length * 10 + 2)
  return { w, h }
}

function edgeLabel(edge, state) {
  const effectPart = (() => {
    if (!edge.effect?.targetObjectId) return ''
    const obj = state.objects.find(o => o.id === edge.effect.targetObjectId)
    const attr = obj?.attrs.find(a => a.id === edge.effect.targetAttrId)
    if (!obj || !attr) return ''
    return attr.type === 'string'
      ? `[${obj.name}:${attr.name}] = "${edge.effect.delta}"`
      : `[${obj.name}:${attr.name}] ${edge.effect.delta}`
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

function getNodeLabel(node, state, loop) {
  if (node.refType === 'object') {
    const obj = state.objects.find(o => o.id === node.refId)
    return obj?.name ?? '?'
  }
  if (node.refType === 'action') {
    for (const obj of state.objects) {
      const action = (obj.actions || []).find(a => a.id === node.refId)
      if (action) return `${obj.name}: ${action.name}`
    }
    const localAction = (loop.localActions || []).find(a => a.id === node.refId)
    if (localAction) {
      const obj = state.objects.find(o => o.id === localAction.objectId)
      return `${obj?.name ?? '?'}: ${localAction.name}`
    }
    return '?'
  }
  if (node.refType === 'event') {
    const evt = (loop.localEvents || []).find(e => e.id === node.refId)
    return evt?.name ?? '?'
  }
  return '?'
}

function buildElements(loop, state) {
  if (!loop) return { nodes: [], edges: [] }

  const nodes = []
  for (const node of loop.nodes) {
    const label = getNodeLabel(node, state, loop)
    const { w, h } = nodeSize(label)
    const el = {
      data: { id: node.id, label, kind: node.refType, entityId: node.refId },
      style: { width: w, height: h, 'text-max-width': w - 16 },
    }
    if (node.x !== undefined && node.y !== undefined) el.position = { x: node.x, y: node.y }
    nodes.push(el)
  }

  const nodeIds = new Set(nodes.map(n => n.data.id))
  const edges = loop.edges
    .filter(e => e.fromLoopNodeId && e.toLoopNodeId && nodeIds.has(e.fromLoopNodeId) && nodeIds.has(e.toLoopNodeId))
    .map(e => ({
      data: { id: e.id, source: e.fromLoopNodeId, target: e.toLoopNodeId, label: edgeLabel(e, state) },
    }))

  return { nodes, edges }
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

export default function GraphView({ state, selectedLoopId, selectedId, onSelectLoopNode, onPositionChange, fitCounter, panTo }) {
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
      onSelectLoopNode(evt.target.id())
    })
    cy.on('dragfree', 'node', evt => {
      const node = evt.target
      const { x, y } = node.position()
      onPositionChangeRef.current(node.id(), x, y)
    })
    cyRef.current = cy
    return () => { cy.destroy(); cyRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    const loop = state.loops.find(l => l.id === selectedLoopId)
    const { nodes, edges } = buildElements(loop, state)
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
        onPositionChangeRef.current(node.data.id, node.position.x, node.position.y)
      }
      const newIds = new Set(unpositioned.map(n => n.data.id))
      const newCyNodes = cy.nodes().filter(n => newIds.has(n.id()))
      if (newCyNodes.length > 0) cy.animate({ center: { eles: newCyNodes }, duration: 300 })
    }
  }, [state, selectedLoopId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (selectedId) cy.getElementById(selectedId).addClass('highlighted')
  }, [selectedId, state])

  const loop = state.loops.find(l => l.id === selectedLoopId)
  const isEmpty = !loop || loop.nodes.length === 0

  return (
    <div className="graph-panel">
      <div id="cy" ref={containerRef} />
      {isEmpty && (
        <div className="graph-placeholder">
          {state.loops.length === 0 ? 'Create a loop to get started' : 'Add nodes to this loop'}
        </div>
      )}
    </div>
  )
}
