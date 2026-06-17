import { useState, useRef, useEffect } from 'react'
import * as S from './store'

const OPERATORS = ['<', '<=', '>', '>=', '=', '!=']
const STRING_OPERATORS = ['=', '!=']

function loopNodeLabel(node, state, loop) {
  if (node.refType === 'object') {
    const obj = state.objects.find(o => o.id === node.refId)
    return { text: obj?.name ?? '?', badge: 'OBJ' }
  }
  if (node.refType === 'action') {
    for (const obj of state.objects) {
      const action = (obj.actions || []).find(a => a.id === node.refId)
      if (action) return { text: `${obj.name}: ${action.name}`, badge: 'ACT' }
    }
    const localAction = (loop.localActions || []).find(a => a.id === node.refId)
    if (localAction) {
      const obj = state.objects.find(o => o.id === localAction.objectId)
      return { text: `${obj?.name ?? '?'}: ${localAction.name}`, badge: 'ACT' }
    }
    return { text: '?', badge: 'ACT' }
  }
  if (node.refType === 'event') {
    const evt = (loop.localEvents || []).find(e => e.id === node.refId)
    return { text: evt?.name ?? '?', badge: 'EVT' }
  }
  return { text: '?', badge: '?' }
}

function disambiguateLabel(node, nodes, state, loop) {
  const { text } = loopNodeLabel(node, state, loop)
  const sameRef = nodes.filter(n => n.refId === node.refId)
  if (sameRef.length <= 1) return text
  const idx = sameRef.findIndex(n => n.id === node.id)
  return `${text} (${idx + 1})`
}

// ── Effect row & editor ──────────────────────────────────────────
function EffectRow({ effect, state, onChange, onDelete }) {
  const setF = (field, val) => onChange({ ...effect, [field]: val })
  const selectedObj = state.objects.find(o => o.id === effect.targetObjectId)
  const selectedAttr = selectedObj?.attrs.find(a => a.id === effect.targetAttrId)
  const attrType = selectedAttr?.type ?? 'number'
  return (
    <div className="sub-fields">
      <div className="field-row">
        <span className="field-label">Obj</span>
        <select className="inp flex1" value={effect.targetObjectId || ''}
          onChange={e => onChange({ ...effect, targetObjectId: e.target.value, targetAttrId: '' })}>
          <option value="">none</option>
          {state.objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button className="btn btn-icon-danger" onClick={onDelete}>✕</button>
      </div>
      {selectedObj && (
        <div className="field-row">
          <span className="field-label">Attr</span>
          <select className="inp flex1" value={effect.targetAttrId || ''}
            onChange={e => setF('targetAttrId', e.target.value)}>
            <option value="">-- attr --</option>
            {selectedObj.attrs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}
      {effect.targetObjectId && (
        <div className="field-row">
          <span className="field-label">{attrType === 'string' ? 'Value' : 'Delta'}</span>
          {attrType === 'string' ? (
            <input className="inp small" type="text" value={effect.delta ?? ''}
              onChange={e => setF('delta', e.target.value)} />
          ) : (
            <input className="inp small" type="number" value={effect.delta ?? ''}
              onChange={e => setF('delta', e.target.value === '' ? 0 : Number(e.target.value))} />
          )}
        </div>
      )}
    </div>
  )
}

function EffectsEditor({ effects, state, onChange }) {
  const addEffect = () => onChange([...effects, { id: S.newId(), targetObjectId: '', targetAttrId: '', delta: 0 }])
  return (
    <div>
      {effects.map(eff => (
        <EffectRow key={eff.id} effect={eff} state={state}
          onChange={updated => onChange(effects.map(e => e.id === eff.id ? updated : e))}
          onDelete={() => onChange(effects.filter(e => e.id !== eff.id))} />
      ))}
      <button className="btn btn-add" onClick={addEffect}>+ Add Effect</button>
    </div>
  )
}

// ── Condition row & editor ───────────────────────────────────────
function ConditionRow({ condition, state, onChange, onDelete }) {
  const selectedObj = state.objects.find(o => o.id === condition.objectId)
  const selectedAttr = selectedObj?.attrs.find(a => a.id === condition.attrId)
  const attrType = selectedAttr?.type ?? 'number'
  const operators = attrType === 'string' ? STRING_OPERATORS : OPERATORS
  const setF = (field, val) => {
    const defaults = attrType === 'string' ? { operator: '=', value: '' } : { operator: '<', value: 0 }
    onChange({ ...defaults, ...condition, [field]: val })
  }
  const currentOperator = operators.includes(condition.operator) ? condition.operator : operators[0]
  return (
    <div className="sub-fields">
      <div className="field-row">
        <span className="field-label">Obj</span>
        <select className="inp flex1" value={condition.objectId || ''}
          onChange={e => onChange({ ...condition, objectId: e.target.value, attrId: '' })}>
          <option value="">none</option>
          {state.objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button className="btn btn-icon-danger" onClick={onDelete}>✕</button>
      </div>
      {selectedObj && (
        <>
          <div className="field-row">
            <span className="field-label">Attr</span>
            <select className="inp flex1" value={condition.attrId || ''}
              onChange={e => setF('attrId', e.target.value)}>
              <option value="">-- attr --</option>
              {selectedObj.attrs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field-row">
            <span className="field-label">Op / Val</span>
            <select className="inp" style={{ width: 52 }} value={currentOperator}
              onChange={e => setF('operator', e.target.value)}>
              {operators.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            {attrType === 'string' ? (
              <input className="inp small" type="text" value={condition.value ?? ''}
                onChange={e => setF('value', e.target.value)} />
            ) : (
              <input className="inp small" type="number" value={condition.value ?? 0}
                onChange={e => setF('value', Number(e.target.value))} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ConditionsEditor({ conditions, state, onChange }) {
  const addCondition = () => onChange([...conditions, { id: S.newId(), objectId: '', attrId: '', operator: '<', value: 0 }])
  return (
    <div>
      {conditions.map(cond => (
        <ConditionRow key={cond.id} condition={cond} state={state}
          onChange={updated => onChange(conditions.map(c => c.id === cond.id ? updated : c))}
          onDelete={() => onChange(conditions.filter(c => c.id !== cond.id))} />
      ))}
      <button className="btn btn-add" onClick={addCondition}>+ Add Condition</button>
    </div>
  )
}

// ── Valid targets for an edge's source node ──────────────────────
function validTargets(fromNode, loop, state) {
  if (!fromNode) return loop.nodes
  const localActions = loop.localActions || []

  const notSelf = n => n.id !== fromNode.id

  if (fromNode.refType === 'object') {
    const srcObj = state.objects.find(o => o.id === fromNode.refId)
    const gIds = new Set((srcObj?.actions || []).map(a => a.id))
    const lIds = new Set(localActions.filter(a => a.objectId === fromNode.refId).map(a => a.id))
    return loop.nodes.filter(n => notSelf(n) && n.refType === 'action' && (gIds.has(n.refId) || lIds.has(n.refId)))
  }

  if (fromNode.refType === 'action') {
    let actionObjId = null
    for (const obj of state.objects) {
      if ((obj.actions || []).some(a => a.id === fromNode.refId)) { actionObjId = obj.id; break }
    }
    if (!actionObjId) actionObjId = localActions.find(a => a.id === fromNode.refId)?.objectId ?? null
    return loop.nodes.filter(n =>
      notSelf(n) && (n.refType === 'event' || (n.refType === 'object' && n.refId === actionObjId))
    )
  }

  if (fromNode.refType === 'event') {
    return loop.nodes.filter(n => notSelf(n) && (n.refType === 'object' || n.refType === 'event'))
  }

  return loop.nodes.filter(notSelf)
}

// ── Edge block (collapsible) ─────────────────────────────────────
function EdgeBlock({ label, onDelete, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="edge-block">
      <div className="edge-summary" onClick={() => setOpen(o => !o)}>
        <span className="edge-label">{label}</span>
        <span className="chevron" style={{ transform: open ? 'rotate(90deg)' : '' }}>▶</span>
        <button className="btn btn-icon-danger" onClick={e => { e.stopPropagation(); onDelete() }}>✕</button>
      </div>
      {open && <div className="edge-body">{children}</div>}
    </div>
  )
}

// ── Node edge row (outgoing edge, source node is implicit) ───────
function NodeEdgeRow({ edge, loop, state, loopId, mutate }) {
  const fromNode = loop.nodes.find(n => n.id === edge.fromLoopNodeId)
  const toNode = loop.nodes.find(n => n.id === edge.toLoopNodeId)
  const toLabel = toNode ? disambiguateLabel(toNode, loop.nodes, state, loop) : '?'
  const toIsAction = toNode?.refType === 'action'
  const targets = validTargets(fromNode, loop, state)

  return (
    <EdgeBlock label={`→ ${toLabel}`} onDelete={() => mutate(S.deleteLoopEdge, loopId, edge.id)}>
      <div className="field-row">
        <span className="field-label">To</span>
        <select className="inp flex1" value={edge.toLoopNodeId || ''}
          onChange={e => {
            const newToNode = loop.nodes.find(n => n.id === e.target.value)
            const patch = { toLoopNodeId: e.target.value }
            if (newToNode?.refType !== 'action') patch.conditions = []
            mutate(S.updateLoopEdge, loopId, edge.id, patch)
          }}>
          <option value="">-- node --</option>
          {targets.map(n => (
            <option key={n.id} value={n.id}>{disambiguateLabel(n, loop.nodes, state, loop)}</option>
          ))}
        </select>
      </div>
      <div className="subsection-label">Effects</div>
      <EffectsEditor effects={edge.effects || []} state={state}
        onChange={effs => mutate(S.updateLoopEdge, loopId, edge.id, { effects: effs })} />
      {toIsAction && (
        <>
          <div className="subsection-label">Conditions</div>
          <ConditionsEditor conditions={edge.conditions || []} state={state}
            onChange={conds => mutate(S.updateLoopEdge, loopId, edge.id, { conditions: conds })} />
        </>
      )}
    </EdgeBlock>
  )
}

// ── Node picker popover ──────────────────────────────────────────
function NodePicker({ state, onPick, onClose }) {
  const allActions = state.objects.flatMap(obj =>
    (obj.actions || []).map(action => ({ objectName: obj.name, action }))
  )
  return (
    <div className="node-picker">
      {state.objects.length > 0 && (
        <>
          <div className="node-picker-section-label">Objects</div>
          {state.objects.map(obj => (
            <button key={obj.id} className="node-picker-item"
              onClick={() => { onPick('object', obj.id); onClose() }}>
              <span className="loop-node-badge badge-object">OBJ</span>
              <span>{obj.name}</span>
            </button>
          ))}
        </>
      )}
      {allActions.length > 0 && (
        <>
          <div className="node-picker-section-label">Actions</div>
          {allActions.map(({ objectName, action }) => (
            <button key={action.id} className="node-picker-item"
              onClick={() => { onPick('action', action.id); onClose() }}>
              <span className="loop-node-badge badge-action">ACT</span>
              <span>{objectName}: {action.name}</span>
            </button>
          ))}
        </>
      )}
      {state.objects.length === 0 && allActions.length === 0 && (
        <div className="node-picker-empty">No objects or actions yet</div>
      )}
    </div>
  )
}

// ── Local action picker ──────────────────────────────────────────
function LocalActionPicker({ state, onPick, onClose }) {
  return (
    <div className="node-picker">
      {state.objects.length === 0 ? (
        <div className="node-picker-empty">No objects yet</div>
      ) : (
        <>
          <div className="node-picker-section-label">Pick an object</div>
          {state.objects.map(obj => (
            <button key={obj.id} className="node-picker-item"
              onClick={() => { onPick(obj.id); onClose() }}>
              <span className="loop-node-badge badge-object">OBJ</span>
              <span>{obj.name}</span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}

// ── Loop panel ───────────────────────────────────────────────────
function LoopPanel({ loop, state, mutate, selectedId, onSelect }) {
  const [showPicker, setShowPicker] = useState(false)
  const [showActionPicker, setShowActionPicker] = useState(false)
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set())
  const pickerWrapRef = useRef(null)
  const actionPickerWrapRef = useRef(null)
  const dragNodeIdRef = useRef(null)
  const loopId = loop.id

  useEffect(() => {
    if (!showPicker) return
    const handler = e => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  useEffect(() => {
    if (!showActionPicker) return
    const handler = e => {
      if (actionPickerWrapRef.current && !actionPickerWrapRef.current.contains(e.target)) setShowActionPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showActionPicker])

  const toggleNode = (nodeId) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  return (
    <div className="loop-panel">
      <div className="loop-name-row">
        <span className="field-label">Loop name</span>
        <input className="inp flex1" value={loop.name}
          onChange={e => mutate(S.updateLoop, loopId, { name: e.target.value })}
          placeholder="loop name" />
      </div>
      <div className="loop-panel-actions">
        <div style={{ position: 'relative' }} ref={pickerWrapRef}>
          <button className="btn btn-add" onClick={() => setShowPicker(v => !v)}>+ Add node</button>
          {showPicker && (
            <NodePicker
              state={state}
              onPick={(refType, refId) => mutate(S.addLoopNode, loopId, refType, refId)}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
        <button className="btn btn-add" onClick={() => mutate(S.addLocalEvent, loopId)}>+ Add event</button>
        <div style={{ position: 'relative' }} ref={actionPickerWrapRef}>
          <button className="btn btn-add" onClick={() => setShowActionPicker(v => !v)}>+ Add local action</button>
          {showActionPicker && (
            <LocalActionPicker
              state={state}
              onPick={(objectId) => mutate(S.addLocalAction, loopId, objectId)}
              onClose={() => setShowActionPicker(false)}
            />
          )}
        </div>
      </div>

      <div className="subsection-label" style={{ marginTop: 6 }}>NODES</div>
      {loop.nodes.length === 0 && (
        <div style={{ color: '#4a5a80', fontSize: 11, padding: '2px 0 4px' }}>No nodes yet</div>
      )}
      {loop.nodes.map(node => {
        const { badge } = loopNodeLabel(node, state, loop)
        const label = disambiguateLabel(node, loop.nodes, state, loop)
        const isSelected = selectedId === node.id
        const isExpanded = expandedNodeIds.has(node.id)
        const outgoingEdges = loop.edges.filter(e => e.fromLoopNodeId === node.id)

        let nameEl
        if (node.refType === 'event') {
          const evt = loop.localEvents.find(e => e.id === node.refId)
          nameEl = evt
            ? <input className="inp flex1 loop-node-name-inp" value={evt.name}
                onClick={e => e.stopPropagation()}
                onChange={e => mutate(S.updateLocalEvent, loopId, evt.id, { name: e.target.value })}
                placeholder="event name" />
            : <span className="loop-node-label">{label}</span>
        } else if (node.refType === 'action') {
          const localAction = (loop.localActions || []).find(a => a.id === node.refId)
          if (localAction) {
            const obj = state.objects.find(o => o.id === localAction.objectId)
            nameEl = (
              <>
                <span className="loop-node-obj-prefix">{obj?.name ?? '?'}:</span>
                <input className="inp flex1 loop-node-name-inp" value={localAction.name}
                  onClick={e => e.stopPropagation()}
                  onChange={e => mutate(S.updateLocalAction, loopId, localAction.id, { name: e.target.value })}
                  placeholder="action name" />
              </>
            )
          } else {
            let foundObj = null, foundAction = null
            for (const obj of state.objects) {
              const a = (obj.actions || []).find(a => a.id === node.refId)
              if (a) { foundObj = obj; foundAction = a; break }
            }
            nameEl = foundAction
              ? <><span className="loop-node-obj-prefix">{foundObj.name}:</span>
                  <input className="inp flex1 loop-node-name-inp" value={foundAction.name}
                    onClick={e => e.stopPropagation()}
                    onChange={e => mutate(S.updateAction, foundObj.id, foundAction.id, { name: e.target.value })}
                    placeholder="action name" /></>
              : <span className="loop-node-label">{label}</span>
          }
        } else {
          nameEl = <span className="loop-node-label">{label}</span>
        }

        return (
          <div key={node.id} className="loop-node-block" data-entity-id={node.id}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
            onDrop={e => {
              e.preventDefault()
              const fromId = dragNodeIdRef.current
              if (!fromId || fromId === node.id) return
              const nodes = [...loop.nodes]
              const fromIdx = nodes.findIndex(n => n.id === fromId)
              const toIdx = nodes.findIndex(n => n.id === node.id)
              const [moved] = nodes.splice(fromIdx, 1)
              nodes.splice(toIdx, 0, moved)
              mutate(S.updateLoop, loopId, { nodes })
            }}>
            <div
              className={`loop-node-row${isSelected ? ' selected' : ''}`}
              onClick={() => onSelect(node.id)}>
              <span className="node-drag-handle"
                draggable
                onDragStart={e => { dragNodeIdRef.current = node.id; e.dataTransfer.effectAllowed = 'move'; e.stopPropagation() }}
                onDragEnd={() => { dragNodeIdRef.current = null }}
                onClick={e => e.stopPropagation()}>⠿</span>
              <span className="chevron" style={{ transform: isExpanded ? 'rotate(90deg)' : '' }}
                onClick={e => { e.stopPropagation(); toggleNode(node.id) }}>▶</span>
              <span className={`loop-node-badge badge-${node.refType}`}>{badge}</span>
              {nameEl}
              <button className="btn btn-icon-danger"
                onClick={e => { e.stopPropagation(); mutate(S.removeLoopNode, loopId, node.id) }}>✕</button>
            </div>
            {isExpanded && (
              <div className="loop-node-edges">
                {outgoingEdges.map(edge => (
                  <NodeEdgeRow key={edge.id} edge={edge} loop={loop} state={state} loopId={loopId} mutate={mutate} />
                ))}
                <button className="btn btn-add" style={{ marginTop: 2 }}
                  onClick={() => mutate(S.addLoopEdge, loopId, node.id)}>+ Add Edge</button>
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}

// ── Action block (simplified — just name) ────────────────────────
function ActionBlock({ action, objectId, mutate }) {
  return (
    <div className="action-block">
      <div className="action-header">
        <input className="inp flex1" value={action.name}
          onChange={e => mutate(S.updateAction, objectId, action.id, { name: e.target.value })}
          placeholder="action name" />
        <button className="btn btn-icon-danger"
          onClick={() => mutate(S.deleteAction, objectId, action.id)}>✕</button>
      </div>
    </div>
  )
}

// ── Object block ─────────────────────────────────────────────────
function ObjectBlock({ obj, state, mutate, isOpen, onToggle }) {
  return (
    <div className="entity-block" data-entity-id={obj.id}>
      <div className="entity-header">
        <span className="chevron" style={{ transform: isOpen ? 'rotate(90deg)' : '' }} onClick={onToggle}>▶</span>
        <input className="inp flex1 name-input" value={obj.name}
          onChange={e => mutate(S.updateObject, obj.id, { name: e.target.value })}
          placeholder="object name" />
        <button className="btn btn-danger-sm" onClick={() => mutate(S.deleteObject, obj.id)}>Delete</button>
      </div>
      {isOpen && (
        <div className="entity-body">
          <div className="subsection-label">ATTRIBUTES</div>
          {obj.attrs.map(attr => (
            <div key={attr.id} className="attr-row">
              <input className="inp flex1" value={attr.name} placeholder="name"
                onChange={e => mutate(S.updateAttr, obj.id, attr.id, { name: e.target.value })} />
              <select className="inp" style={{ width: 72 }} value={attr.type}
                onChange={e => mutate(S.updateAttr, obj.id, attr.id, { type: e.target.value })}>
                <option value="number">number</option>
                <option value="string">string</option>
              </select>
              <input className="inp small" value={attr.value} placeholder="val"
                onChange={e => mutate(S.updateAttr, obj.id, attr.id, { value: e.target.value })} />
              <button className="btn btn-icon-danger" onClick={() => mutate(S.deleteAttr, obj.id, attr.id)}>✕</button>
            </div>
          ))}
          <button className="btn btn-add" onClick={() => mutate(S.addAttr, obj.id)}>+ Add Attribute</button>

          <div className="subsection-label" style={{ marginTop: 8 }}>ACTIONS</div>
          {(obj.actions || []).map(action => (
            <ActionBlock key={action.id} action={action} objectId={obj.id} mutate={mutate} />
          ))}
          <button className="btn btn-add" onClick={() => mutate(S.addAction, obj.id)}>+ Add Action</button>
        </div>
      )}
    </div>
  )
}

const SIDEBAR_WIDTH_KEY = 'gameloop_sidebar_width'

// ── Main Sidebar ─────────────────────────────────────────────────
export default function Sidebar({ state, mutate, selectedId, onSelect, onClearSelect, onImport, selectedLoopId, onLoopSelect }) {
  const [activeTab, setActiveTab] = useState('objects')
  const [openIds, setOpenIds] = useState(new Set())
  const fileInputRef = useRef(null)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10)
    return (saved >= 200 && saved <= 500) ? saved : 240
  })
  const currentWidthRef = useRef(sidebarWidth)

  const handleResizeStart = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = currentWidthRef.current
    const onMouseMove = (mv) => {
      const w = Math.min(500, Math.max(200, startWidth + (mv.clientX - startX)))
      setSidebarWidth(w)
      currentWidthRef.current = w
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      localStorage.setItem(SIDEBAR_WIDTH_KEY, currentWidthRef.current)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const toggle = id => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); onClearSelect() }
      else next.add(id)
      return next
    })
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'gameloop-schema.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = file => {
    const reader = new FileReader()
    reader.onload = e => {
      try { onImport(JSON.parse(e.target.result)) }
      catch { alert('Failed to parse JSON.') }
    }
    reader.readAsText(file)
  }

  const selectedLoop = state.loops.find(l => l.id === selectedLoopId)

  return (
    <div className="sidebar" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
      <div className="sidebar-resize-handle" onMouseDown={handleResizeStart} />
      <div className="sidebar-actions">
        <button className="btn btn-secondary" onClick={handleExport}>Export JSON</button>
        <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>Import JSON</button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = '' }} />
      </div>

      <div className="sidebar-tabs">
        <button className={`tab-btn${activeTab === 'objects' ? ' active' : ''}`}
          onClick={() => setActiveTab('objects')}>Objects</button>
        <button className={`tab-btn${activeTab === 'loops' ? ' active' : ''}`}
          onClick={() => setActiveTab('loops')}>Loops</button>
      </div>

      <div className="sidebar-body">
        {activeTab === 'objects' ? (
          <>
            <div className="section-header">
              <span>OBJECTS</span>
              <button className="btn btn-add-inline" onClick={() => {
                const id = S.newId()
                mutate(s => ({ ...s, objects: [...s.objects, { id, name: 'New Object', attrs: [], actions: [] }] }))
                setOpenIds(prev => new Set([...prev, id]))
              }}>+ Add Object</button>
            </div>
            {state.objects.map(obj => (
              <ObjectBlock key={obj.id} obj={obj} state={state} mutate={mutate}
                isOpen={openIds.has(obj.id)} onToggle={() => toggle(obj.id)} />
            ))}
          </>
        ) : (
          <>
            <div className="loop-tabs-bar">
              {state.loops.map(loop => (
                <button key={loop.id}
                  className={`loop-tab-btn${loop.id === selectedLoopId ? ' active' : ''}`}
                  onClick={() => onLoopSelect(loop.id)}>
                  <span className="loop-tab-name">{loop.name || 'Loop'}</span>
                  <span className="loop-tab-close"
                    onClick={e => { e.stopPropagation(); mutate(S.deleteLoop, loop.id) }}>✕</span>
                </button>
              ))}
              <button className="btn btn-add loop-add-btn" onClick={() => {
                const id = S.newId()
                mutate(s => ({ ...s, loops: [...s.loops, { id, name: 'New Loop', nodes: [], localEvents: [], localActions: [], edges: [] }] }))
                onLoopSelect(id)
              }}>+ Add Loop</button>
            </div>

            {selectedLoop ? (
              <LoopPanel
                key={selectedLoop.id}
                loop={selectedLoop}
                state={state}
                mutate={mutate}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ) : (
              <div style={{ color: '#4a5a80', padding: '12px 10px', fontSize: 12 }}>
                {state.loops.length === 0 ? 'No loops yet. Create one above.' : 'Select a loop above.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
