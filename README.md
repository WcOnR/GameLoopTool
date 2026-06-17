# GameLoop Tool

A visual editor for game mechanics schemas. Build Objects, Attributes, Actions, and Events, then see the connections rendered as a live directed graph.

## Open tool

https://wconr.github.io/GameLoopTool/

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/GameLoopTool/ in your browser.

## Deploy to GitHub Pages

```bash
npm run deploy
```

This builds the app (`npm run build`) and pushes the `dist/` folder to the `gh-pages` branch of your repository. The live site will be available at `https://<your-username>.github.io/GameLoopTool/`.

> First-time setup: make sure the repository on GitHub has GitHub Pages configured to serve from the `gh-pages` branch (Settings → Pages → Source → Branch: `gh-pages`, folder: `/ (root)`).

## JSON Schema

This is the format used when you Export or Import JSON from the tool. The document is a single JSON object with two top-level arrays: `objects` and `loops`.

### Complete example

```json
{
  "objects": [
    {
      "id": "obj-1",
      "name": "Player",
      "attrs": [
        { "id": "attr-1", "name": "health", "type": "number", "value": 100 },
        { "id": "attr-2", "name": "stamina", "type": "number", "value": 50 }
      ],
      "actions": [
        { "id": "act-1", "name": "Attack" },
        { "id": "act-2", "name": "Dodge" }
      ]
    },
    {
      "id": "obj-2",
      "name": "Enemy",
      "attrs": [
        { "id": "attr-3", "name": "health", "type": "number", "value": 80 }
      ],
      "actions": [
        { "id": "act-3", "name": "Strike" }
      ]
    }
  ],
  "loops": [
    {
      "id": "loop-1",
      "name": "Combat Loop",
      "nodes": [
        { "id": "node-1", "refType": "object",  "refId": "obj-1",   "x": 100, "y": 150 },
        { "id": "node-2", "refType": "action",  "refId": "act-1",   "x": 300, "y": 100 },
        { "id": "node-3", "refType": "action",  "refId": "act-1",   "x": 300, "y": 250 },
        { "id": "node-4", "refType": "action",  "refId": "lact-1",  "x": 500, "y": 100 },
        { "id": "node-5", "refType": "event",   "refId": "levt-1",  "x": 500, "y": 250 },
        { "id": "node-6", "refType": "object",  "refId": "obj-2",   "x": 700, "y": 150 }
      ],
      "localActions": [
        { "id": "lact-1", "name": "Heal Self", "objectId": "obj-1" }
      ],
      "localEvents": [
        { "id": "levt-1", "name": "On Hit" }
      ],
      "edges": [
        {
          "id": "edge-1",
          "fromLoopNodeId": "node-1",
          "toLoopNodeId": "node-2",
          "conditions": [
            { "id": "cond-1", "objectId": "obj-1", "attrId": "attr-1", "operator": ">=", "value": 30 },
            { "id": "cond-2", "objectId": "obj-2", "attrId": "attr-3", "operator": ">",  "value": 0  }
          ],
          "effects": [
            { "id": "eff-1", "targetObjectId": "obj-2", "targetAttrId": "attr-3", "delta": -10 }
          ]
        },
        {
          "id": "edge-2",
          "fromLoopNodeId": "node-2",
          "toLoopNodeId": "node-5",
          "conditions": [],
          "effects": [
            { "id": "eff-2", "targetObjectId": "obj-1", "targetAttrId": "attr-1", "delta": -5  },
            { "id": "eff-3", "targetObjectId": "obj-1", "targetAttrId": "attr-2", "delta": -10 }
          ]
        }
      ]
    }
  ]
}
```

Note that `node-2` and `node-3` both have `refId: "act-1"` — the same action appears twice in the loop as two distinct nodes. See the [Node deduplication](#node-deduplication) section below.

---

### Field reference

#### Top level

| Field     | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `objects` | array   | yes      | All game objects defined in the schema. |
| `loops`   | array   | yes      | All loops defined in the schema. |

---

#### Object

Each entry in `objects`.

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | yes      | Unique identifier (UUID). |
| `name`    | string | yes      | Display name of the object. |
| `attrs`   | array  | yes      | List of attributes belonging to this object. |
| `actions` | array  | yes      | List of actions belonging to this object. |

---

#### Attribute (`attrs` entry)

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `id`    | string | yes      | Unique identifier. |
| `name`  | string | yes      | Attribute name (e.g. `"health"`). |
| `type`  | string | yes      | Data type: `"number"` or `"string"`. |
| `value` | number \| string | yes | Default / initial value. Type matches the `type` field (`number` → numeric, `string` → string). |

---

#### Action (`actions` entry, nested under object)

| Field  | Type   | Required | Description |
|--------|--------|----------|-------------|
| `id`   | string | yes      | Unique identifier. |
| `name` | string | yes      | Display name of the action. |

---

#### Loop

Each entry in `loops`.

| Field          | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `id`           | string | yes      | Unique identifier. |
| `name`         | string | yes      | Display name of the loop. |
| `nodes`        | array  | yes      | Loop-node instances placed in the graph for this loop. |
| `localActions` | array  | yes      | Actions that exist only within this loop (not shared globally). |
| `localEvents`  | array  | yes      | Events that exist only within this loop. |
| `edges`        | array  | yes      | Directed connections between loop-nodes. |

---

#### Loop node (`nodes` entry)

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | yes      | Unique identifier for this node instance within the loop. |
| `refType` | string | yes      | What the node represents: `"object"`, `"action"`, or `"event"`. |
| `refId`   | string | yes      | ID of the referenced object, action, or event. |
| `x`       | number | no       | Canvas x position (saved after the node is dragged). |
| `y`       | number | no       | Canvas y position (saved after the node is dragged). |

---

#### Local action (`localActions` entry)

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `id`       | string | yes      | Unique identifier. Referenced by a loop node with `refType: "action"`. |
| `name`     | string | yes      | Display name. |
| `objectId` | string | yes      | ID of the object this action belongs to. |

---

#### Local event (`localEvents` entry)

| Field  | Type   | Required | Description |
|--------|--------|----------|-------------|
| `id`   | string | yes      | Unique identifier. Referenced by a loop node with `refType: "event"`. |
| `name` | string | yes      | Display name. |

---

#### Edge (`edges` entry)

| Field            | Type             | Required | Description |
|------------------|------------------|----------|-------------|
| `id`             | string           | yes      | Unique identifier. |
| `fromLoopNodeId` | string           | yes      | `id` of the source loop-node. |
| `toLoopNodeId`   | string           | yes      | `id` of the target loop-node. |
| `conditions`     | array            | yes      | List of guard conditions (may be empty). Only applicable when the edge targets an Action node; must be `[]` for edges targeting Object or Event nodes. All conditions are combined with AND logic. |
| `effects`        | array            | yes      | List of attribute mutations to apply (may be empty). All effects fire simultaneously when the edge is triggered. |

#### Allowed connections

Not all source→target combinations are valid. The permitted connections depend on the source node's type:

| Source type | Allowed target types |
|-------------|----------------------|
| **Object** | Action nodes that belong to that same object (global or local actions whose `objectId` matches the source object). |
| **Action** | Object nodes that own this action, or any Event node in the loop. |
| **Event** | Any Object node, or any other Event node in the loop. |

> **Condition scoping:** Conditions gate whether an action can be taken, so they only make sense on edges that lead into an Action node. Edges leading into Object or Event nodes are always unconditional and may only carry an optional Effect.

---

#### Condition entry (`conditions` item)

Each entry in the `conditions` array. All conditions on an edge are evaluated together with AND logic — every condition must hold for the edge to be considered active.

| Field      | Type             | Required | Description |
|------------|------------------|----------|-------------|
| `id`       | string           | yes      | Unique identifier for this condition entry. |
| `objectId` | string           | yes      | ID of the object whose attribute is checked. |
| `attrId`   | string           | yes      | ID of the attribute to compare. |
| `operator` | string           | yes      | Comparison operator. For `number` attributes: `<`, `<=`, `>`, `>=`, `=`, or `!=`. For `string` attributes: only `=` or `!=`. |
| `value`    | number \| string | yes      | The value to compare against. Matches the target attribute's type. |

---

#### Effect entry (`effects` item)

Each entry in the `effects` array. All effects on an edge are applied independently and simultaneously when the edge fires.

| Field            | Type             | Required | Description |
|------------------|------------------|----------|-------------|
| `id`             | string           | yes      | Unique identifier for this effect entry. |
| `targetObjectId` | string           | yes      | ID of the object whose attribute is mutated. |
| `targetAttrId`   | string           | yes      | ID of the attribute to change. |
| `delta`          | number \| string | yes      | For `number` attributes: numeric amount added (use negative to subtract). For `string` attributes: the new value to assign. |

---

### Node deduplication

The same object or action can appear **multiple times** within a single loop as separate loop-node instances. For example, an `Attack` action might appear as both a source and a target in different edges of the same loop.

Each node instance has its own unique `id` (the loop-node id). Edges connect loop-node ids — **not** raw object/action ids — so the graph can unambiguously route a connection to the correct occurrence of a repeated entity. When you see two nodes with the same `refId`, they are independent graph nodes that both happen to represent the same underlying object or action.
