"use client";

import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink, CalendarDays, Link2 } from "lucide-react";
import type { SavedLink } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type LinkCardProps = {
  link: SavedLink;
  onDelete: (id: string) => void;
  viewMode?: "grid" | "list";
};

const categoryVariants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  Music: "default",
  Sports: "default",
  Education: "secondary",
  Movies: "secondary",
  News: "destructive",
  Gaming: "default",
  Entertainment: "secondary",
  Other: "outline",
};

export function LinkCard({ link, onDelete, viewMode = "grid" }: LinkCardProps) {
  // If platform isn't defined on older links, default to 'Web'
  const platform = (link as any).platform || "Web";

  // --- COMPACT LIST VIEW ---
  if (viewMode === "list") {
    return (
      <TooltipProvider>
        <Card className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
          <div className="flex-grow min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs bg-background shrink-0">{platform}</Badge>
              <Badge variant={categoryVariants[link.category] || "outline"} className="text-xs shrink-0 capitalize">
                {link.category}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 ml-auto sm:ml-2">
                <CalendarDays className="h-3 w-3" />
                {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
              </span>
            </div>
            
            <CardTitle className="text-base font-heading truncate">
              {link.title}
            </CardTitle>
            
            <p className="text-sm text-muted-foreground line-clamp-1">{link.description}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
             <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" asChild>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label="Open link in new tab">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Open Link</p></TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onDelete(link.id)} aria-label="Delete link">
                  <Trash2 className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Delete Link</p></TooltipContent>
            </Tooltip>
          </div>
        </Card>
      </TooltipProvider>
    );
  }

  // --- STANDARD GRID VIEW ---
  return (
    <TooltipProvider>
      <Card className="flex flex-col h-full group overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all">
         <div className="relative w-full aspect-[16/9] overflow-hidden bg-muted flex items-center justify-center">
           {link.thumbnailUrl ? (
             <Image 
              src={link.thumbnailUrl}
              alt={`Thumbnail for ${link.title}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
             />
           ) : (
             <Link2 className="h-10 w-10 text-muted-foreground/30" />
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
           <Badge variant="secondary" className="absolute bottom-3 left-3 text-xs bg-background/90 backdrop-blur-sm">
             {platform}
           </Badge>
        </div>

        <CardHeader className="pt-4 pb-2">
          <div className="flex justify-between items-start gap-4 mb-1">
            <CardTitle className="font-heading text-lg leading-tight line-clamp-2" title={link.title}>
              {link.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <Badge variant={categoryVariants[link.category] || "outline"} className="shrink-0 capitalize text-xs">
              {link.category}
            </Badge>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={link.creatorName}>
              {link.creatorName}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-grow pb-2">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{link.description}</p>
        </CardContent>

        <CardFooter className="flex justify-between items-center text-xs text-muted-foreground bg-muted/20 py-3 px-4 sm:px-6 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}</span>
          </div>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label="Open link in new tab">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Open Link</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(link.id)} aria-label="Delete link">
                  <Trash2 className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Delete Link</p></TooltipContent>
            </Tooltip>
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}