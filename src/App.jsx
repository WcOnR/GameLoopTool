import { useState, useCallback, useEffect } from 'react'
import { loadState, saveState, updateLoopNodePosition } from './store'
import Sidebar from './Sidebar'
import GraphView from './GraphView'

export default function App() {
  const [state, setState] = useState(() => loadState())
  const [selectedId, setSelectedId] = useState(null)
  const [selectedLoopId, setSelectedLoopId] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [fitCounter, setFitCounter] = useState(0)
  const [panTo, setPanTo] = useState({ id: null, seq: 0 })

  // Auto-select first loop when selected loop becomes invalid
  useEffect(() => {
    if (selectedLoopId && state.loops.some(l => l.id === selectedLoopId)) return
    setSelectedLoopId(state.loops[0]?.id ?? null)
  }, [state.loops, selectedLoopId])

  const mutate = useCallback((fn, ...args) => {
    setState(prev => {
      const next = fn(prev, ...args)
      saveState(next)
      return next
    })
  }, [])

  const handleImport = useCallback((parsed) => {
    if (!parsed.objects || !parsed.loops) { alert('Invalid schema file.'); return }
    setState(parsed)
    saveState(parsed)
    setSelectedLoopId(parsed.loops[0]?.id ?? null)
    setSelectedId(null)
    setFitCounter(c => c + 1)
  }, [])

  const handleLoopNodePositionChange = useCallback((nodeId, x, y) => {
    mutate(updateLoopNodePosition, selectedLoopId, nodeId, x, y)
  }, [mutate, selectedLoopId])

  const handleLoopSelect = useCallback((loopId) => {
    setSelectedLoopId(loopId)
    setSelectedId(null)
    setFitCounter(c => c + 1)
  }, [])

  // Graph node clicked — highlight + scroll sidebar to loop-node row
  const handleGraphSelect = useCallback(id => {
    setSelectedId(id)
    setTimeout(() => {
      const el = document.querySelector(`[data-entity-id="${id}"]`)
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 50)
  }, [])

  // Sidebar loop-node clicked — highlight + pan graph to node
  const handleSidebarSelect = useCallback(id => {
    setSelectedId(id)
    setPanTo(prev => ({ id, seq: prev.seq + 1 }))
  }, [])

  // Drag-and-drop import
  useEffect(() => {
    const onDragOver = e => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setDragging(true) }
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
        selectedLoopId={selectedLoopId}
        onLoopSelect={handleLoopSelect}
      />
      <GraphView
        state={state}
        selectedLoopId={selectedLoopId}
        selectedId={selectedId}
        onSelectLoopNode={handleGraphSelect}
        onPositionChange={handleLoopNodePositionChange}
        fitCounter={fitCounter}
        panTo={panTo}
      />
    </div>
  )
}
