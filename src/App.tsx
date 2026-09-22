import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Table, Input, Button, Space, ConfigProvider, theme, Grid } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Key } from 'react'

const { useBreakpoint } = Grid

// Highlight matching text in a string
function highlightText(text: string, search: string): ReactNode {
  if (!search.trim() || !text) return text

  const searchLower = search.toLowerCase()
  const textLower = text.toLowerCase()
  const index = textLower.indexOf(searchLower)

  if (index === -1) return text

  const before = text.slice(0, index)
  const match = text.slice(index, index + search.length)
  const after = text.slice(index + search.length)

  return (
    <>
      {before}
      <mark style={{ background: '#ffe066', padding: '0 2px', borderRadius: 2 }}>{match}</mark>
      {after}
    </>
  )
}

interface RegionData {
  atlases: string[]
  atlasKeys: string[]
  totalRegions: number
  regions: RegionNode[]
}

interface RegionNode {
  key: string
  id: number
  name: string
  children?: RegionNode[]
  [key: string]: unknown
}

function App() {
  const [data, setData] = useState<RegionNode[]>([])
  const [atlases, setAtlases] = useState<string[]>([])
  const [atlasKeys, setAtlasKeys] = useState<string[]>([])
  const [totalRegions, setTotalRegions] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<readonly Key[]>([])
  const [loading, setLoading] = useState(true)
  const [tableHeight, setTableHeight] = useState(400)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const screens = useBreakpoint()

  // Calculate table height dynamically
  useEffect(() => {
    const calculateHeight = () => {
      if (tableContainerRef.current) {
        const height = tableContainerRef.current.clientHeight
        setTableHeight(Math.max(height - 55, 200)) // 55px for table header
      }
    }

    calculateHeight()
    const resizeObserver = new ResizeObserver(calculateHeight)
    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  // Load data
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}regions.json`)
      .then(res => res.json())
      .then((result: RegionData) => {
        setData(result.regions)
        setAtlases(result.atlases)
        setAtlasKeys(result.atlasKeys)
        setTotalRegions(result.totalRegions)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load regions:', err)
        setLoading(false)
      })
  }, [])

  // Column widths - responsive based on screen size
  const nameColWidth = screens.md ? 350 : screens.sm ? 250 : 180
  const atlasColWidth = screens.lg ? 180 : screens.md ? 140 : 100
  const totalScrollX = nameColWidth + (atlasKeys.length * atlasColWidth) + 50 // +50 for expand icon

  // Column definitions
  const columns: ColumnsType<RegionNode> = [
    {
      title: 'Region Name',
      dataIndex: 'name',
      key: 'name',
      width: nameColWidth,
      fixed: screens.sm ? 'left' : undefined, // Only fix on sm+
      render: (value: string) => highlightText(value, searchText),
    },
    ...atlasKeys.map((key, index) => ({
      title: screens.md ? (atlases[index] || key) : (atlases[index]?.split(' ')[0] || key),
      dataIndex: key,
      key: key,
      width: atlasColWidth,
      align: 'center' as const,
      render: (value: string | null) => {
        if (!value) {
          return <span style={{ color: '#ccc' }}>—</span>
        }
        return <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{highlightText(value, searchText)}</span>
      }
    }))
  ]

  // Collect all keys from tree
  const getAllKeys = (nodes: RegionNode[]): string[] => {
    const keys: string[] = []
    const traverse = (items: RegionNode[]) => {
      for (const item of items) {
        keys.push(item.key)
        if (item.children) {
          traverse(item.children)
        }
      }
    }
    traverse(nodes)
    return keys
  }

  // Expand all
  const expandAll = () => {
    setExpandedKeys(getAllKeys(data))
  }

  // Collapse all
  const collapseAll = () => {
    setExpandedKeys([])
  }

  // Filter data based on search
  const filterTree = (nodes: RegionNode[], searchLower: string): RegionNode[] => {
    const result: RegionNode[] = []

    for (const node of nodes) {
      const nameMatch = node.name.toLowerCase().includes(searchLower)
      const acronymMatch = atlasKeys.some(key => {
        const val = node[key]
        return typeof val === 'string' && val.toLowerCase().includes(searchLower)
      })

      let filteredChildren: RegionNode[] | undefined
      if (node.children) {
        filteredChildren = filterTree(node.children, searchLower)
      }

      if (nameMatch || acronymMatch || (filteredChildren && filteredChildren.length > 0)) {
        result.push({
          ...node,
          children: filteredChildren && filteredChildren.length > 0 ? filteredChildren : undefined
        })
      }
    }

    return result
  }

  const filteredData = searchText.trim()
    ? filterTree(data, searchText.toLowerCase())
    : data

  // Auto-expand when searching
  useEffect(() => {
    if (searchText.trim()) {
      setExpandedKeys(getAllKeys(filteredData))
    }
  }, [searchText, filteredData])

  // Handle expand/collapse
  const onExpand = (expanded: boolean, record: RegionNode) => {
    if (expanded) {
      setExpandedKeys(prev => [...prev, record.key])
    } else {
      setExpandedKeys(prev => prev.filter(k => k !== record.key))
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#667eea',
        },
      }}
    >
      <div className="app">
        <header className="header">
          <h1>Multi-Atlas Brain Region Comparison</h1>
          <p className="stats">
            {totalRegions} unique regions | {atlases.length} atlases
          </p>
        </header>

        <div className="controls">
          <Input.Search
            placeholder="Search by region name or acronym..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 350 }}
            size="large"
          />
          <Space>
            <Button type="primary" onClick={expandAll}>
              Expand All
            </Button>
            <Button onClick={collapseAll}>
              Collapse All
            </Button>
          </Space>
          {searchText && (
            <span className="match-count">
              {getAllKeys(filteredData).length} matches
            </span>
          )}
        </div>

        <div className="table-container" ref={tableContainerRef}>
          <Table
            virtual
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            expandable={{
              expandedRowKeys: expandedKeys as Key[],
              onExpand: onExpand,
              indentSize: screens.sm ? 24 : 16,
            }}
            pagination={false}
            scroll={{ x: totalScrollX, y: tableHeight }}
            size="small"
          />
        </div>
      </div>
    </ConfigProvider>
  )
}

export default App
