import { useState, useRef, useEffect } from 'react'
import * as S from './store'

// ── Shared: Effect fields ────────────────────────────────────────
function EffectFields({ effect, state, onChange }) {
  const setF = (field, val) => onChange({ ...(effect || {}), [field]: val })
  const selectedObj = state.objects.find(o => o.id === effect?.targetObjectId)
  return (
    <div className="effect-fields">
      <div className="field-row">
        <span className="field-label">Object</span>
        <select className="inp flex1" value={effect?.targetObjectId || ''}
          onChange={e => onChange(e.target.value ? { ...(effect || {}), targetObjectId: e.target.value, targetAttrId: '' } : null)}>
          <option value="">none</option>
          {state.objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      {selectedObj && (
        <div className="field-row">
          <span className="field-label">Attr</span>
          <select className="inp flex1" value={effect?.targetAttrId || ''}
            onChange={e => setF('targetAttrId', e.target.value)}>
            <option value="">-- attr --</option>
            {selectedObj.attrs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}
      {effect?.targetObjectId && (
        <div className="field-row">
          <span className="field-label">Delta</span>
          <input className="inp small" type="number" value={effect?.delta ?? ''}
            onChange={e => setF('delta', e.target.value === '' ? 0 : Number(e.target.value))} />
          <button className="btn btn-sm" onClick={() => onChange(null)}>Clear</button>
        </div>
      )}
    </div>
  )
}

// ── Action edge row (→ Event only) ──────────────────────────────
function ActionEdgeRow({ edge, state, actionId, mutate }) {
  const [open, setOpen] = useState(!edge.toEventId)
  const label = (() => {
    const evt = state.events.find(e => e.id === edge.toEventId)
    const eff = edge.effect?.targetObjectId
      ? (() => {
          const o = state.objects.find(x => x.id === edge.effect.targetObjectId)
          const a = o?.attrs.find(x => x.id === edge.effect.targetAttrId)
          return o && a ? ` [${o.name}:${a.name}] ${edge.effect.delta}` : ''
        })()
      : ''
    return evt ? `→ ${evt.name}${eff}` : '→ ?'
  })()

  return (
    <div className="edge-block">
      <div className="edge-summary" onClick={() => setOpen(o => !o)}>
        <span className="edge-label">{label}</span>
        <span className="chevron" style={{ transform: open ? 'rotate(90deg)' : '' }}>▶</span>
        <button className="btn btn-icon-danger" onClick={e => { e.stopPropagation(); mutate(S.deleteActionEdge, actionId, edge.id) }}>✕</button>
      </div>
      {open && (
        <div className="edge-body">
          <div className="field-row">
            <span className="field-label">→ Event</span>
            <select className="inp flex1" value={edge.toEventId || ''}
              onChange={e => mutate(S.updateActionEdge, actionId, edge.id, { toEventId: e.target.value })}>
              <option value="">-- select event --</option>
              {state.events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <div className="subsection-label">Effect</div>
          <EffectFields effect={edge.effect} state={state}
            onChange={eff => mutate(S.updateActionEdge, actionId, edge.id, { effect: eff })} />
        </div>
      )}
    </div>
  )
}

// ── Event edge row (→ Attr only) ─────────────────────────────────
function EventEdgeRow({ edge, state, eventId, mutate }) {
  const [open, setOpen] = useState(!edge.toAttrId)

  // Build attr options: all attrs across all objects
  const attrOptions = []
  for (const obj of state.objects) {
    for (const attr of obj.attrs) {
      attrOptions.push({ id: attr.id, label: `${obj.name}: ${attr.name}` })
    }
  }

  const label = (() => {
    let attrLabel = '?'
    for (const obj of state.objects) {
      const attr = obj.attrs.find(a => a.id === edge.toAttrId)
      if (attr) { attrLabel = `${obj.name}: ${attr.name}`; break }
    }
    const eff = edge.effect?.targetObjectId
      ? (() => {
          const o = state.objects.find(x => x.id === edge.effect.targetObjectId)
          const a = o?.attrs.find(x => x.id === edge.effect.targetAttrId)
          return o && a ? ` [${o.name}:${a.name}] ${edge.effect.delta}` : ''
        })()
      : ''
    return `→ ${attrLabel}${eff}`
  })()

  return (
    <div className="edge-block">
      <div className="edge-summary" onClick={() => setOpen(o => !o)}>
        <span className="edge-label">{label}</span>
        <span className="chevron" style={{ transform: open ? 'rotate(90deg)' : '' }}>▶</span>
        <button className="btn btn-icon-danger" onClick={e => { e.stopPropagation(); mutate(S.deleteEventEdge, eventId, edge.id) }}>✕</button>
      </div>
      {open && (
        <div className="edge-body">
          <div className="field-row">
            <span className="field-label">→ Attr</span>
            <select className="inp flex1" value={edge.toAttrId || ''}
              onChange={e => mutate(S.updateEventEdge, eventId, edge.id, { toAttrId: e.target.value })}>
              <option value="">-- select attr --</option>
              {attrOptions.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div className="subsection-label">Effect</div>
          <EffectFields effect={edge.effect} state={state}
            onChange={eff => mutate(S.updateEventEdge, eventId, edge.id, { effect: eff })} />
        </div>
      )}
    </div>
  )
}

// ── Trigger row ──────────────────────────────────────────────────
function TriggerRow({ trigger, state, eventId, mutate }) {
  const obj = state.objects.find(o => o.id === trigger.objectId)
  return (
    <div className="trigger-row">
      <select className="inp flex1" value={trigger.objectId || ''}
        onChange={e => mutate(S.updateTrigger, eventId, trigger.id, { objectId: e.target.value, attrId: '' })}>
        <option value="">-- object --</option>
        {state.objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select className="inp flex1" value={trigger.attrId || ''}
        onChange={e => mutate(S.updateTrigger, eventId, trigger.id, { attrId: e.target.value })}>
        <option value="">-- attr --</option>
        {(obj?.attrs || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select className="inp" style={{ width: 52 }} value={trigger.condition || '<'}
        onChange={e => mutate(S.updateTrigger, eventId, trigger.id, { condition: e.target.value })}>
        {['<', '<=', '>', '>=', '=', '!='].map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input className="inp small" type="number" value={trigger.value ?? 0}
        onChange={e => mutate(S.updateTrigger, eventId, trigger.id, { value: Number(e.target.value) })} />
      <button className="btn btn-icon-danger" onClick={() => mutate(S.deleteTrigger, eventId, trigger.id)}>✕</button>
    </div>
  )
}

// ── Action block ─────────────────────────────────────────────────
function ActionBlock({ action, state, mutate, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false)

  return (
    <div className="action-block">
      <div className="action-header" onClick={() => setOpen(o => !o)}>
        <span className="chevron" style={{ transform: open ? 'rotate(90deg)' : '' }}>▶</span>
        <input className="inp flex1" value={action.name}
          onClick={e => e.stopPropagation()}
          onChange={e => mutate(S.updateAction, action.id, { name: e.target.value })}
          placeholder="action name" />
        <button className="btn btn-icon-danger" onClick={e => { e.stopPropagation(); mutate(S.deleteAction, action.id) }}>✕</button>
      </div>
      {open && (
        <div className="action-body">
          <div className="subsection-label">OWNER EFFECT</div>
          <EffectFields effect={action.effect} state={state}
            onChange={eff => mutate(S.updateAction, action.id, { effect: eff })} />

          <div className="subsection-label" style={{ marginTop: 6 }}>EDGES</div>
          {action.edges.map(edge => (
            <ActionEdgeRow key={edge.id} edge={edge} state={state} actionId={action.id} mutate={mutate} />
          ))}
          <button className="btn btn-add" onClick={() => mutate(S.addActionEdge, action.id)}>+ Add Edge</button>
        </div>
      )}
    </div>
  )
}

// ── Object block ─────────────────────────────────────────────────
function ObjectBlock({ obj, state, mutate, isOpen, onToggle }) {
  const actions = state.actions.filter(a => a.objectId === obj.id)

  return (
    <div className="entity-block" data-entity-id={obj.id}>
      <div className="entity-header">
        <span className="chevron" style={{ transform: isOpen ? 'rotate(90deg)' : '' }}
          onClick={onToggle}>▶</span>
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
                <option value="object">object</option>
              </select>
              <input className="inp small" value={attr.value} placeholder="val"
                onChange={e => mutate(S.updateAttr, obj.id, attr.id, { value: e.target.value })} />
              <button className="btn btn-icon-danger" onClick={() => mutate(S.deleteAttr, obj.id, attr.id)}>✕</button>
            </div>
          ))}
          <button className="btn btn-add" onClick={() => mutate(S.addAttr, obj.id)}>+ Add Attribute</button>

          <div className="subsection-label" style={{ marginTop: 8 }}>ACTIONS</div>
          {actions.map(action => (
            <ActionBlock key={action.id} action={action} state={state} mutate={mutate} />
          ))}
          <button className="btn btn-add" onClick={() => mutate(S.addAction, obj.id)}>+ Add Action</button>
        </div>
      )}
    </div>
  )
}

// ── Event block ──────────────────────────────────────────────────
function EventBlock({ evt, state, mutate, isOpen, onToggle }) {
  return (
    <div className="entity-block" data-entity-id={evt.id}>
      <div className="entity-header">
        <span className="chevron" style={{ transform: isOpen ? 'rotate(90deg)' : '' }}
          onClick={onToggle}>▶</span>
        <input className="inp flex1 name-input" value={evt.name}
          onChange={e => mutate(S.updateEvent, evt.id, { name: e.target.value })}
          placeholder="event name" />
        <button className="btn btn-danger-sm" onClick={() => mutate(S.deleteEvent, evt.id)}>Delete</button>
      </div>
      {isOpen && (
        <div className="entity-body">
          <div className="subsection-label">TRIGGERS</div>
          {evt.triggers.map(t => (
            <TriggerRow key={t.id} trigger={t} state={state} eventId={evt.id} mutate={mutate} />
          ))}
          <button className="btn btn-add" onClick={() => mutate(S.addTrigger, evt.id)}>+ Add Trigger</button>

          <div className="subsection-label" style={{ marginTop: 8 }}>EDGES</div>
          {evt.edges.map(edge => (
            <EventEdgeRow key={edge.id} edge={edge} state={state} eventId={evt.id} mutate={mutate} />
          ))}
          <button className="btn btn-add" onClick={() => mutate(S.addEventEdge, evt.id)}>+ Add Edge</button>
        </div>
      )}
    </div>
  )
}

// ── Main Sidebar ─────────────────────────────────────────────────
export default function Sidebar({ state, mutate, selectedId, onSelect, onClearSelect }) {
  const [openIds, setOpenIds] = useState(new Set())
  const fileInputRef = useRef(null)

  // When graph clicks an entity, open its block
  useEffect(() => {
    if (selectedId) setOpenIds(prev => new Set([...prev, selectedId]))
  }, [selectedId])

  const toggle = id => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); onClearSelect() }
      else { next.add(id); onSelect(id) }
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
      try {
        const parsed = JSON.parse(e.target.result)
        if (parsed.objects && parsed.events) {
          mutate(() => parsed)
        } else alert('Invalid schema file.')
      } catch { alert('Failed to parse JSON.') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="sidebar">
      <div className="sidebar-actions">
        <button className="btn btn-secondary" onClick={handleExport}>Export JSON</button>
        <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>Import JSON</button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = '' }} />
      </div>

      <div className="sidebar-body">
        <div className="section-header">
          <span>OBJECTS</span>
          <button className="btn btn-add-inline" onClick={() => {
            const id = S.newId()
            mutate(s => ({ ...s, objects: [...s.objects, { id, name: 'New Object', attrs: [] }] }))
            setOpenIds(prev => new Set([...prev, id]))
          }}>+ Add Object</button>
        </div>

        {state.objects.map(obj => (
          <ObjectBlock key={obj.id} obj={obj} state={state} mutate={mutate}
            isOpen={openIds.has(obj.id)} onToggle={() => toggle(obj.id)} />
        ))}

        <div className="section-header" style={{ marginTop: 8 }}>
          <span>EVENTS</span>
          <button className="btn btn-add-inline" onClick={() => {
            const id = S.newId()
            mutate(s => ({ ...s, events: [...s.events, { id, name: 'New Event', triggers: [], edges: [] }] }))
            setOpenIds(prev => new Set([...prev, id]))
          }}>+ Add Event</button>
        </div>

        {state.events.map(evt => (
          <EventBlock key={evt.id} evt={evt} state={state} mutate={mutate}
            isOpen={openIds.has(evt.id)} onToggle={() => toggle(evt.id)} />
        ))}
      </div>
    </div>
  )
}
