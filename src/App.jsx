import { useState, useCallback, useEffect } from 'react'
import { loadState, saveState, updateObject, updateAction, updateEvent } from './store'
import Sidebar from './Sidebar'
import GraphView from './GraphView'

export default function App() {
  const [state, setState] = useState(() => loadState())
  const [selectedId, setSelectedId] = useState(null)
  const [dragging, setDragging] = useState(false)

  const mutate = useCallback((fn, ...args) => {
    setState(prev => {
      const next = fn(prev, ...args)
      saveState(next)
      return next
    })
  }, [])

  const handlePositionChange = useCallback((id, kind, x, y) => {
    if (kind === 'object') mutate(updateObject, id, { x, y })
    else if (kind === 'action') mutate(updateAction, id, { x, y })
    else if (kind === 'event') mutate(updateEvent, id, { x, y })
  }, [mutate])

  const handleGraphSelect = useCallback(id => {
    setSelectedId(id)
    setTimeout(() => {
      const el = document.querySelector(`[data-entity-id="${id}"]`)
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 50)
  }, [])

  useEffect(() => {
    const onDragOver = e => { e.preventDefault(); setDragging(true) }
    const onDragLeave = () => setDragging(false)
    const onDrop = e => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = evt => {
        try {
          const parsed = JSON.parse(evt.target.result)
          if (parsed.objects && parsed.events) {
            setState(parsed)
            saveState(parsed)
          } else alert('Invalid schema file.')
        } catch { alert('Failed to parse JSON.') }
      }
      reader.readAsText(file)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return (
    <div className="app">
      {dragging && <div className="drop-overlay">Drop JSON to import</div>}
      <Sidebar
        state={state}
        mutate={mutate}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onClearSelect={() => setSelectedId(null)}
      />
      <GraphView
        state={state}
        selectedId={selectedId}
        onSelectEntity={handleGraphSelect}
        onPositionChange={handlePositionChange}
      />
    </div>
  )
}
