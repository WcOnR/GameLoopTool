import { useState } from 'react'
import { newId } from './store'

function buildEdgeLabel(edge, schema) {
  const effectPart = edge.effect?.targetObject
    ? (() => {
        const obj = schema.objects.find(o => o.id === edge.effect.targetObject)
        const attr = edge.effect.targetAttr || '?'
        const delta = edge.effect.delta !== undefined ? edge.effect.delta : '?'
        return obj ? `[${obj.name}:${attr}] ${delta}` : `[?:${attr}] ${delta}`
      })()
    : null

  const targetPart = (() => {
    if (!edge.to) return '?'
    const evt = schema.events.find(e => e.id === edge.to)
    if (evt) return evt.name
    for (const obj of schema.objects) {
      const attr = obj.attrs.find(a => a.id === edge.to)
      if (attr) return `${obj.name}:${attr.name}`
    }
    return '?'
  })()

  if (effectPart) return `→ ${effectPart} → ${targetPart}`
  return `→ ${targetPart}`
}

function EdgeForm({ edge, schema, onChange, onDelete }) {
  const [open, setOpen] = useState(!edge.to)

  const allEvents = schema.events
  const allAttrs = []
  for (const obj of schema.objects) {
    for (const attr of obj.attrs) {
      allAttrs.push({ id: attr.id, label: `${obj.name}:${attr.name}`, objId: obj.id, objName: obj.name, attrName: attr.name })
    }
  }

  const setEffect = (field, val) => onChange({ ...edge, effect: { ...(edge.effect || {}), [field]: val } })

  const targetOptions = [
    ...allEvents.map(e => ({ value: e.id, label: `Event: ${e.name}`, type: 'event' })),
    ...allAttrs.map(a => ({ value: a.id, label: `Attr: ${a.label}`, type: 'attribute' })),
  ]

  const handleTargetChange = (val) => {
    const opt = targetOptions.find(o => o.value === val)
    if (!opt) return
    onChange({ ...edge, to: val, toType: opt.type })
  }

  const label = buildEdgeLabel(edge, schema)

  return (
    <div className="edge-row">
      <div className="edge-summary" onClick={() => setOpen(o => !o)}>
        <span className="edge-label">{label}</span>
        <span className="chevron" style={{ fontSize: 9, marginLeft: 4, transform: open ? 'rotate(90deg)' : '' }}>▶</span>
        <button
          className="btn btn-icon"
          style={{ marginLeft: 'auto', fontSize: 11 }}
          onClick={e => { e.stopPropagation(); onDelete() }}
          title="Remove edge"
        >✕</button>
      </div>

      {open && (
        <div className="edge-fields">
          <div className="edge-field-row">
            <span className="edge-field-label">→ Target</span>
            <select
              className="inline-input flex1"
              value={edge.to || ''}
              onChange={e => handleTargetChange(e.target.value)}
            >
              <option value="">-- select --</option>
              {targetOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="edge-field-row">
            <span className="edge-field-label">Effect obj</span>
            <select
              className="inline-input flex1"
              value={edge.effect?.targetObject || ''}
              onChange={e => setEffect('targetObject', e.target.value)}
            >
              <option value="">none</option>
              {schema.objects.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {edge.effect?.targetObject && (() => {
            const obj = schema.objects.find(o => o.id === edge.effect.targetObject)
            return obj ? (
              <div className="edge-field-row">
                <span className="edge-field-label">Attr</span>
                <select
                  className="inline-input flex1"
                  value={edge.effect?.targetAttr || ''}
                  onChange={e => setEffect('targetAttr', e.target.value)}
                >
                  <option value="">-- attr --</option>
                  {obj.attrs.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
            ) : null
          })()}

          <div className="edge-field-row">
            <span className="edge-field-label">Delta</span>
            <input
              className="inline-input small"
              type="number"
              value={edge.effect?.delta ?? ''}
              onChange={e => setEffect('delta', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function EdgeEditor({ edges, schema, onChange }) {
  const addEdge = () => {
    onChange([...edges, { id: newId(), to: '', toType: 'event', effect: null }])
  }

  const updateEdge = (idx, updated) => {
    onChange(edges.map((e, i) => i === idx ? updated : e))
  }

  const deleteEdge = (idx) => {
    onChange(edges.filter((_, i) => i !== idx))
  }

  return (
    <div className="edge-list">
      {edges.map((edge, i) => (
        <EdgeForm
          key={edge.id || i}
          edge={edge}
          schema={schema}
          onChange={upd => updateEdge(i, upd)}
          onDelete={() => deleteEdge(i)}
        />
      ))}
      <button className="btn btn-add" onClick={addEdge}>+ Add Edge</button>
    </div>
  )
}
