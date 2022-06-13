import BusinessStyles from "@/pages/DataAnalysis/RealTimeBusinessFlow/index.less";
import { useState, useRef, useCallback, useMemo } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  MiniMap,
  MarkerType,
} from "react-flow-renderer";

import "./styles/index.less";
import { useModel } from "@@/plugin-model/useModel";
import { BusinessChartResponse } from "@/services/realTimeTrafficFlow";
import NodeContent from "@/pages/DataAnalysis/RealTimeBusinessFlow/components/BusinessChart/NodeContent";
import { BusinessEngineEnum } from "@/models/dataanalysis/useRealTimeTraffic";

interface BusinessTreeNode extends BusinessChartResponse {
  children: BusinessTreeNode[];
}

const DefaultDistanceX = 280;
const DefaultDistanceY = 200;

let id = 0;
const getId = () => `dndNode_${id++}`;

const BusinessChart = () => {
  const { realTimeTraffic } = useModel("dataAnalysis");
  const {
    businessChart,
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
  } = realTimeTraffic;

  const reactFlowWrapper = useRef<any>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const makeTree = useCallback(
    (nodes: BusinessChartResponse[]): BusinessTreeNode | undefined => {
      const initTreeNode = (table: string): BusinessTreeNode => {
        const node = nodes.find((traffic) => traffic.table === table)!;
        if (!node.deps?.length || node.deps?.length <= 0) {
          return {
            ...node,
            children: [],
          };
        }
        return {
          ...node,
          children: node.deps.map((dep) => initTreeNode(dep)),
        };
      };

      // find root node
      const deps = nodes.reduce(
        (prev, node) => [...prev, ...node.deps],
        [] as string[]
      );
      const rootNodes = nodes.filter((node) => !deps.includes(node.table));
      if (rootNodes.length <= 0) return;
      const rootNode = rootNodes[0];

      return initTreeNode(rootNode.table);
    },
    []
  );

  const businessTree = useMemo(() => {
    return makeTree(businessChart);
  }, [businessChart, makeTree]);

  const visitTree = useCallback(
    (node: BusinessTreeNode, treeNodeDetail: any[], depth = 1) => {
      const struct = {
        node: node.table,
        depth,
        index: 1,
      };
      const nodeParent = businessChart.find((business) =>
        business.deps.includes(node.table)
      );
      if (nodeParent && nodeParent.deps.length > 1) {
        struct.index = nodeParent.deps.findIndex(
          (table) => table === node.table
        );
      }
      treeNodeDetail.push(struct);
      node.children.forEach((child) =>
        visitTree(child, treeNodeDetail, depth + 1)
      );
    },
    [businessChart]
  );

  const TreeStructure: any[] = useMemo(() => {
    const treeNodeDetail: any[] = [];
    if (businessTree) visitTree(businessTree, treeNodeDetail);
    return treeNodeDetail;
  }, [businessTree]);

  useMemo(() => {
    if (businessChart.length <= 0) return;

    // Node
    const NodeList: any[] = [];
    const EdgeList: any[] = [];

    for (const business of businessChart) {
      const isLast = business.deps.length === 0 && businessChart.length > 1;

      const isHeader =
        businessChart.length === 1 ||
        businessChart
          .filter((item) => item.table !== business.table)
          .findIndex((item) => !item.deps.includes(business.table)) > -1;

      const type = isLast ? "output" : isHeader ? "input" : "default";
      const nodeStruct = TreeStructure.find(
        (node) => business.table === node.node
      );

      let background = "#fff";
      switch (business.engine) {
        case BusinessEngineEnum.Kafka:
          background = "#fec89a";
          break;
        case BusinessEngineEnum.MergeTree:
          background = "#ffbf69";
          break;
        case BusinessEngineEnum.Distributed:
          background = "#f9dcc4";
          break;
        default:
          break;
      }

      NodeList.push({
        id: business.table,
        type,
        data: { label: <NodeContent node={business} /> },
        position: {
          x: DefaultDistanceX * nodeStruct.index,
          y: DefaultDistanceY * nodeStruct.depth,
        },
        style: {
          width: 240,
          height: 100,
          background: background,
        },
      });
      if (isLast) {
        EdgeList.push({ id: business.table, source: business.table });
      } else {
        business.deps.map((dep) => {
          EdgeList.push({
            id: `${business.table}-${dep}`,
            source: business.table,
            target: dep,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          });
        });
      }
    }
    setNodes(NodeList);
    setEdges(EdgeList);
  }, [businessChart, TreeStructure]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  return (
    <div className={BusinessStyles.businessEChart}>
      <div className="dndflow">
        <ReactFlowProvider>
          <div className="reactflow-wrapper" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              attributionPosition="top-right"
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              fitView
            >
              <MiniMap />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default BusinessChart;
