import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Node {
  id: string;
  title: string;
  type: "note" | "tag";
  tags?: string[];
}

interface Link {
  source: string;
  target: string;
  type: "tag" | "related";
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

export default function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const { data: notes, error } = await supabase
        .from("notes")
        .select(`
          id,
          title,
          note_tags (
            tags (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const nodes: Node[] = [];
      const links: Link[] = [];
      const tagNodes = new Set<string>();

      // Create note nodes
      notes?.forEach((note: any) => {
        const tagNames = note.note_tags?.map((nt: any) => nt.tags.name) || [];
        
        nodes.push({
          id: `note-${note.id}`,
          title: note.title || "Untitled",
          type: "note",
          tags: tagNames,
        });

        // Create tag nodes and links
        tagNames.forEach((tag: string) => {
          if (!tagNodes.has(tag)) {
            tagNodes.add(tag);
            nodes.push({
              id: `tag-${tag}`,
              title: tag,
              type: "tag",
            });
          }

          links.push({
            source: `note-${note.id}`,
            target: `tag-${tag}`,
            type: "tag",
          });
        });
      });

      setGraphData({ nodes, links });
    } catch (error: any) {
      toast({
        title: "Error loading graph",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const simulation = d3
      .forceSimulation(graphData.nodes as any)
      .force(
        "link",
        d3
          .forceLink(graphData.links)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => (d.type === "related" ? 2 : 1));

    // Nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(
        d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any
      );

    node
      .append("circle")
      .attr("r", (d) => (d.type === "note" ? 20 : 15))
      .attr("fill", (d) => (d.type === "note" ? "hsl(var(--primary))" : "hsl(var(--accent))"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (d.type === "note") {
          const noteId = d.id.replace("note-", "");
          navigate(`/notes?note=${noteId}`);
        }
      });

    node
      .append("text")
      .text((d) => d.title)
      .attr("x", 0)
      .attr("y", (d) => (d.type === "note" ? 35 : 30))
      .attr("text-anchor", "middle")
      .attr("fill", "hsl(var(--foreground))")
      .attr("font-size", "12px")
      .attr("pointer-events", "none");

    // Tooltip
    node.append("title").text((d) => {
      if (d.type === "note") {
        return `${d.title}${d.tags?.length ? `\nTags: ${d.tags.join(", ")}` : ""}`;
      }
      return d.title;
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graphData, navigate]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border h-14 flex items-center px-4 gap-4">
        <Button onClick={() => navigate("/notes")} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Notes
        </Button>
        <h1 className="text-lg font-semibold">Notes Graph</h1>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary"></div>
            <span>Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-accent"></div>
            <span>Tags</span>
          </div>
        </div>
      </header>
      <div className="flex-1 relative">
        {graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            No notes to display. Create some notes to see the graph.
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
