import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language/LanguageProvider";

interface Node {
  id: string;
  title: string;
  type: "note" | "tag" | "folder";
  tags?: string[];
  folderId?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setIsLoading(true);
    try {
      // Fetch notes with tags and folders
      const { data: notes, error: notesError } = await supabase
        .from("notes")
        .select(`
          id,
          title,
          folder_id,
          note_tags (
            tags (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;

      // Fetch folders
      const { data: folders, error: foldersError } = await supabase
        .from("folders")
        .select("id, name");

      if (foldersError) throw foldersError;

      const nodes: Node[] = [];
      const links: Link[] = [];
      const tagNodes = new Set<string>();
      const folderNodes = new Set<string>();

      // Create folder nodes
      folders?.forEach((folder) => {
        folderNodes.add(folder.id);
        nodes.push({
          id: `folder-${folder.id}`,
          title: folder.name,
          type: "folder",
        });
      });

      // Create note nodes
      const noteIds: string[] = [];
      notes?.forEach((note: any) => {
        noteIds.push(note.id);
        const tagNames = note.note_tags?.map((nt: any) => nt.tags.name) || [];
        
        nodes.push({
          id: `note-${note.id}`,
          title: note.title || "Untitled",
          type: "note",
          tags: tagNames,
          folderId: note.folder_id,
        });

        // Link note to folder
        if (note.folder_id) {
          links.push({
            source: `note-${note.id}`,
            target: `folder-${note.folder_id}`,
            type: "tag",
          });
        }

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

      // Fetch related notes for each note
      for (const noteId of noteIds.slice(0, 20)) { // Limit to first 20 notes for performance
        try {
          const { data: relatedData } = await supabase.functions.invoke('find-related-notes', {
            body: { noteId, limit: 3 }
          });

          relatedData?.relatedNotes?.forEach((related: any) => {
            // Only add link if both notes exist in our graph
            if (noteIds.includes(related.id)) {
              links.push({
                source: `note-${noteId}`,
                target: `note-${related.id}`,
                type: "related",
              });
            }
          });
        } catch (err) {
          console.error("Error fetching related notes:", err);
        }
      }

      setGraphData({ nodes, links });
    } catch (error: any) {
      toast({
        title: t("graph.error_loading"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      .attr("stroke", (d) => (d.type === "related" ? "hsl(var(--primary))" : "#999"))
      .attr("stroke-opacity", (d) => (d.type === "related" ? 0.8 : 0.4))
      .attr("stroke-width", (d) => (d.type === "related" ? 3 : 1))
      .attr("stroke-dasharray", (d) => (d.type === "related" ? "5,5" : "0"));

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
      .attr("r", (d) => (d.type === "note" ? 20 : d.type === "folder" ? 18 : 15))
      .attr("fill", (d) => {
        if (d.type === "note") return "hsl(var(--primary))";
        if (d.type === "folder") return "hsl(var(--chart-2))";
        return "hsl(var(--accent))";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (d.type === "note") {
          const noteId = d.id.replace("note-", "");
          navigate(`/notes?note=${noteId}`);
        } else if (d.type === "folder") {
          const folderId = d.id.replace("folder-", "");
          navigate(`/notes?folder=${folderId}`);
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
          {t("graph.back_to_notes")}
        </Button>
        <h1 className="text-lg font-semibold">{t("graph.title")}</h1>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary"></div>
            <span>{t("graph.legend.notes")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-chart-2"></div>
            <span>{t("graph.legend.folders")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-accent"></div>
            <span>{t("graph.legend.tags")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary" style={{ width: '20px' }}></div>
            <span>{t("graph.legend.related")}</span>
          </div>
        </div>
      </header>
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {t("graph.empty")}
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
