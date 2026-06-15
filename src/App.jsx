import { useState, useCallback, useEffect, useRef } from 'react'
import { loadState, saveState, updateObject, updateAction, updateEvent } from './store'
import Sidebar from './Sidebar'
import GraphView from './GraphView'

export default function App() {
  const [state, setState] = useState(() => loadState())
  const [selectedId, setSelectedId] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [fitCounter, setFitCounter] = useState(0)
  const panToRef = useRef({ id: null, seq: 0 })
  const [panTo, setPanTo] = useState({ id: null, seq: 0 })
  const graphIsolationRef = useRef(null)

  const mutate = useCallback((fn, ...args) => {
    setState(prev => {
      const next = fn(prev, ...args)
      saveState(next)
      return next
    })
  }, [])

  // Shared import handler — used by both file picker and drag-and-drop
  const handleImport = useCallback((parsed) => {
    if (!parsed.objects || !parsed.events) { alert('Invalid schema file.'); return }
    setState(parsed)
    saveState(parsed)
    setFitCounter(c => c + 1)
  }, [])

  const handlePositionChange = useCallback((id, kind, x, y) => {
    if (kind === 'object') mutate(updateObject, id, { x, y })
    else if (kind === 'action') mutate(updateAction, id, { x, y })
    else if (kind === 'event') mutate(updateEvent, id, { x, y })
  }, [mutate])

  // Graph node clicked — highlight + scroll sidebar, no pan
  const handleGraphSelect = useCallback(id => {
    setSelectedId(id)
    setTimeout(() => {
      const el = document.querySelector(`[data-entity-id="${id}"]`)
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 50)
  }, [])

  // Sidebar entity clicked — highlight + pan graph to node
  const handleSidebarSelect = useCallback(id => {
    setSelectedId(id)
    setPanTo(prev => ({ id, seq: prev.seq + 1 }))
  }, [])

  // Drag-and-drop import
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
        try { handleImport(JSON.parse(evt.target.result)) }
        catch { alert('Failed to parse JSON.') }
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
  }, [handleImport])

  return (
    <div className="app">
      {dragging && <div className="drop-overlay">Drop JSON to import</div>}
      <Sidebar
        state={state}
        mutate={mutate}
        selectedId={selectedId}
        onSelect={handleSidebarSelect}
        onClearSelect={() => setSelectedId(null)}
        onImport={handleImport}
        onIsolate={nodeIds => graphIsolationRef.current?.applyIsolation(nodeIds)}
        onClearIsolation={() => graphIsolationRef.current?.clearIsolation()}
      />
      <GraphView
        state={state}
        selectedId={selectedId}
        onSelectEntity={handleGraphSelect}
        onPositionChange={handlePositionChange}
        fitCounter={fitCounter}
        panTo={panTo}
        isolationRef={graphIsolationRef}
      />
    </div>
  )
}
