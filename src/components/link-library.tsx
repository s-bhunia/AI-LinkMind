"use client";

import { useState, useMemo } from "react";
import { LinkCard } from "./link-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Inbox, SlidersHorizontal, LayoutGrid, List, Layers, CalendarArrowDown, CalendarArrowUp, ChevronDown } from "lucide-react";
import type { SavedLink } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type LinkLibraryProps = {
  links: SavedLink[];
  onDelete: (id: string) => void;
};

export function LinkLibrary({ links, onDelete }: LinkLibraryProps) {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  
  // Display Preference State
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc"); // desc = newest first
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [groupByPlatform, setGroupByPlatform] = useState(false);
  
  // Track collapsed state: true = collapsed, false = expanded
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Extract unique categories for the dropdown
  const dynamicCategories = useMemo(() => {
    const categories = new Set(links.map(link => link.category));
    return ["All", ...Array.from(categories).sort()];
  }, [links]);

  // Toggle collapse state for a section
  const toggleSectionCollapse = (groupName: string) => {
    setCollapsedSections(prev => {
      // If undefined, it defaults to true (collapsed), so clicking it makes it false (expanded)
      const isCurrentlyCollapsed = prev[groupName] ?? true;
      return {
        ...prev,
        [groupName]: !isCurrentlyCollapsed,
      };
    });
  };

  // The Master Pipeline: Filter -> Sort
  const filteredAndSortedLinks = useMemo(() => {
    return links
      .filter((link) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          link.title.toLowerCase().includes(search) ||
          link.description.toLowerCase().includes(search) ||
          link.url.toLowerCase().includes(search);
        
        const matchesCategory = filterCategory === "All" || link.category === filterCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [links, searchTerm, filterCategory, sortOrder]);

  // The Grouping Pipeline: takes the filtered/sorted list and chunks it by platform
  const groupedLinks = useMemo(() => {
    if (!groupByPlatform) return { "All Links": filteredAndSortedLinks };
    
    const groups: Record<string, SavedLink[]> = {};
    filteredAndSortedLinks.forEach(link => {
      // Safely handle missing platforms by defaulting to 'Web'
      const platform = (link as any).platform || 'Web';
      if (!groups[platform]) groups[platform] = [];
      groups[platform].push(link);
    });
    
    return groups;
  }, [filteredAndSortedLinks, groupByPlatform]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      
      {/* --- TOP CONTROL BAR --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-3 rounded-lg border shadow-sm">
        
        {/* Left side: View & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md p-1 bg-muted/50">
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 px-2" 
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" /> Grid
            </Button>
            <Button 
              variant={viewMode === "list" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 px-2" 
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-1.5" /> List
            </Button>
          </div>

          {/* Group By Platform Toggle */}
          <Button 
            variant={groupByPlatform ? "default" : "outline"} 
            size="sm" 
            className="h-9"
            onClick={() => {
              setGroupByPlatform(!groupByPlatform);
              if (!groupByPlatform) {
                // Reset collapse state when turning on grouping so all default to collapsed
                setCollapsedSections({}); 
              }
            }}
          >
            <Layers className="h-4 w-4 mr-2" />
            {groupByPlatform ? "Grouped" : "Group by Platform"}
          </Button>

          {/* Sort Order Toggle */}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9"
            onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
            title="Toggle Sort Order"
          >
            {sortOrder === "desc" ? (
              <><CalendarArrowDown className="h-4 w-4 mr-2" /> Newest</>
            ) : (
              <><CalendarArrowUp className="h-4 w-4 mr-2" /> Oldest</>
            )}
          </Button>
        </div>
      </div>

      {/* --- SEARCH & FILTER BAR --- */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search titles, descriptions, or URLs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
            aria-label="Search links"
          />
        </div>
        
        {/* Mobile Filter Sheet */}
        <div className="md:hidden flex">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full h-11">
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Filter
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Filter Links</SheetTitle>
                <SheetDescription>Apply filters to narrow down your link library.</SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Desktop Filter Select */}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full md:w-[240px] h-11 hidden md:flex">
             <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent className="min-w-[240px]">
            {dynamicCategories.map(cat => (
              <SelectItem key={cat} value={cat} className="cursor-pointer py-2.5">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* --- RENDER CONTENT --- */}
      {filteredAndSortedLinks.length > 0 ? (
        <div className="space-y-10 animate-in fade-in-50 duration-500">
          {Object.entries(groupedLinks).map(([groupName, groupLinks]) => {
            // If grouped, default to true (collapsed). If not grouped, always false (expanded).
            const isGroupCollapsed = groupByPlatform ? (collapsedSections[groupName] ?? true) : false;

            return (
              <div key={groupName} className="space-y-4">
                
                {/* Render Section Headers only if grouping is enabled */}
                {groupByPlatform && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleSectionCollapse(groupName)}
                      className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
                      aria-label={isGroupCollapsed ? "Expand section" : "Collapse section"}
                    >
                      <ChevronDown 
                        className={`h-5 w-5 transition-transform duration-200 ${
                          isGroupCollapsed ? "rotate-0" : "rotate-180"
                        }`}
                      />
                    </button>
                    <h2 className="text-xl font-heading font-semibold tracking-tight">{groupName}</h2>
                    <div className="h-px bg-border flex-grow mt-1" />
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {groupLinks.length}
                    </span>
                  </div>
                )}

                {/* Render Grid or List based on View Mode - Conditional on Collapse State */}
                {!isGroupCollapsed && (
                  <div className={
                    viewMode === "grid" 
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                      : "flex flex-col gap-3"
                  }>
                    {groupLinks.map((link) => (
                      <LinkCard key={link.id} link={link} onDelete={onDelete} viewMode={viewMode} />
                    ))}
                  </div>
                )}
                
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg animate-in fade-in-0 duration-500">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground"/>
          <h3 className="mt-4 text-xl font-semibold text-foreground font-headline">No Links Found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {links.length > 0 ? "Try adjusting your search or filters." : "Get started by adding a new link above!"}
          </p>
        </div>
      )}
    </div>
  );
}