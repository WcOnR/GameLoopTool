import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'

cytoscape.use(dagre)

function effectLabel(effect, state) {
  if (!effect?.targetObjectId) return ''
  const obj = state.objects.find(o => o.id === effect.targetObjectId)
  const attr = obj?.attrs.find(a => a.id === effect.targetAttrId)
  if (!obj || !attr) return ''
  return `[${obj.name}:${attr.name}] ${effect.delta}`
}

function buildElements(state) {
  const nodes = []
  const edges = []

  // Object nodes
  for (const obj of state.objects) {
    const attrLines = obj.attrs.map(a => `${a.name}: ${a.value}`).join('\n')
    nodes.push({
      data: {
        id: obj.id,
        label: obj.name + (attrLines ? '\n' + attrLines : ''),
        kind: 'object',
        entityId: obj.id,
      },
    })
  }

  // Action nodes + Object→Action + Action→Event edges
  for (const action of state.actions) {
    nodes.push({
      data: { id: action.id, label: action.name, kind: 'action', entityId: action.id },
    })

    // Object → Action
    edges.push({
      data: {
        id: `oa-${action.id}`,
        source: action.objectId,
        target: action.id,
        label: effectLabel(action.effect, state),
      },
    })

    // Action → Event
    for (const edge of action.edges) {
      if (!edge.toEventId) continue
      edges.push({
        data: {
          id: `ae-${edge.id}`,
          source: action.id,
          target: edge.toEventId,
          label: effectLabel(edge.effect, state),
        },
      })
    }
  }

  // Event nodes + Event→Object edges
  for (const evt of state.events) {
    nodes.push({
      data: { id: evt.id, label: evt.name, kind: 'event', entityId: evt.id },
    })

    for (const edge of evt.edges) {
      if (!edge.toAttrId) continue
      // Find the object that owns this attr
      let targetObjId = null
      let attrName = ''
      for (const obj of state.objects) {
        const attr = obj.attrs.find(a => a.id === edge.toAttrId)
        if (attr) { targetObjId = obj.id; attrName = attr.name; break }
      }
      if (!targetObjId) continue
      const eLabel = `→ ${attrName}${edge.effect ? ' ' + effectLabel(edge.effect, state) : ''}`
      edges.push({
        data: { id: `eo-${edge.id}`, source: evt.id, target: targetObjId, label: eLabel },
      })
    }
  }

  const nodeIds = new Set(nodes.map(n => n.data.id))
  return [...nodes, ...edges.filter(e => nodeIds.has(e.data.source) && nodeIds.has(e.data.target))]
}

const STYLE = [
  {
    selector: 'node[kind="object"]',
    style: {
      shape: 'rectangle',
      'background-color': '#4a6fa5',
      'border-color': '#2d4f7c',
      'border-width': 2,
      color: '#ddeeff',
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'font-size': 11,
      padding: '10px',
      'min-zoomed-font-size': 6,
    },
  },
  {
    selector: 'node[kind="action"]',
    style: {
      shape: 'polygon',
      'shape-polygon-points': '-0.75 -1 1 -1 0.75 1 -1 1',
      'background-color': '#2d8c6e',
      'border-color': '#1a5c48',
      'border-width': 2,
      color: '#ccffee',
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 11,
      padding: '8px',
      'min-zoomed-font-size': 6,
    },
  },
  {
    selector: 'node[kind="event"]',
    style: {
      shape: 'roundrectangle',
      'background-color': '#c47d1a',
      'border-color': '#8a5510',
      'border-width': 2,
      color: '#fff3cc',
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 11,
      padding: '8px',
      'min-zoomed-font-size': 6,
    },
  },
  {
    selector: 'node.highlighted',
    style: { 'border-color': '#ffdd44', 'border-width': 3 },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': '#3a5a7a',
      'target-arrow-color': '#3a5a7a',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      'font-size': 9,
      color: '#8ab',
      'text-background-color': '#0f0f23',
      'text-background-opacity': 0.85,
      'text-background-padding': '2px',
    },
  },
]

export default function GraphView({ state, selectedId, onSelectEntity }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: STYLE,
      layout: { name: 'preset' },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: true,
    })
    cy.on('tap', 'node', evt => {
      const entityId = evt.target.data('entityId')
      if (entityId) onSelectEntity(entityId)
    })
    cyRef.current = cy
    return () => { cy.destroy(); cyRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const els = buildElements(state)
    cy.elements().remove()
    if (els.length > 0) {
      cy.add(els)
      cy.layout({ name: 'dagre', rankDir: 'LR', nodeSep: 50, rankSep: 80, animate: false }).run()
    }
  }, [state])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.nodes().removeClass('highlighted')
    if (selectedId) {
      cy.nodes().filter(n => n.data('entityId') === selectedId).addClass('highlighted')
    }
  }, [selectedId, state])

  const isEmpty = state.objects.length === 0 && state.events.length === 0

  return (
    <div className="graph-panel">
      <div id="cy" ref={containerRef} />
      {isEmpty && <div className="graph-placeholder">Add an object or event to get started</div>}
    </div>
  )
}
