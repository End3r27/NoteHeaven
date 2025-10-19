import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language/LanguageProvider";

interface ExportDialogProps {
  noteTitle: string;
  noteBody: string;
}

export function ExportDialog({ noteTitle, noteBody }: ExportDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const exportAsMarkdown = () => {
    const markdown = `# ${noteTitle}\n\n${noteBody}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exported!",
      description: "Note exported as Markdown"
    });
  };

  const exportAsPDF = async () => {
    // Create a simple HTML version for PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${noteTitle}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
            }
            h1 {
              color: #1a1a1a;
              margin-bottom: 20px;
            }
            p {
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <h1>${noteTitle}</h1>
          <p>${noteBody.replace(/\n/g, '<br>')}</p>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exported!",
      description: "Note exported as HTML (open in browser and print to PDF)"
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {t("notes.export")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Note</DialogTitle>
          <DialogDescription>
            Choose a format to export your note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            onClick={exportAsMarkdown}
            variant="outline"
            className="w-full justify-start"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export as Markdown (.md)
          </Button>

          <Button
            onClick={exportAsPDF}
            variant="outline"
            className="w-full justify-start"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export as HTML (for PDF)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
