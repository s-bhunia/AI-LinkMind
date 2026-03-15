"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Plus, Loader, AlertTriangle, Wand2, CheckCircle, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CategorizationResult, SavedLink } from "@/lib/types";

const formSchema = z.object({
  url: z.string().trim().url({ message: "Please enter a valid URL." }),
});

type LinkFormProps = {
  onLinkAdded: (newLink: SavedLink) => void;
  existingCategories: string[];
  links: SavedLink[];
};

export function LinkForm({ onLinkAdded, existingCategories, links }: LinkFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categorizationResult, setCategorizationResult] = useState<CategorizationResult | null>(null);
  const [url, setUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  useEffect(() => {
    // Define the global function for Android WebView to call
    (window as any).setSharedUrl = (url: string) => {
      form.setValue('url', url, { shouldValidate: true });
    };

    // Cleanup function: remove the global function when the component unmounts
    return () => {
      delete (window as any).setSharedUrl;
    };
  }, [form]); // Re-run effect if the form instance changes (unlikely for this component)

  async function onSubmit(values: z.infer<typeof formSchema>) {

    if (links.some(link => link.url === values.url)) {
      toast({
        variant: "destructive",
        title: "Duplicate Link",
        description: "This link has already been saved.",
      });
      return;
    }

    setIsSubmitting(true);
    setCategorizationResult(null);
    setUrl(values.url);

    try {
      // Use API endpoint instead of direct server action to avoid caching issues
      const response = await fetch('/api/link-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: values.url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to categorize link');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to categorize link');
      }

      const result = data.data;
      if (result.confidence >= 0.8) {
        const newLink: SavedLink = {
          id: uuidv4(),
          url: values.url,
          title: result.title,
          description: result.description,
          creatorName: result.creatorName,
          category: result.category,
          thumbnailUrl: result.thumbnailUrl,
          createdAt: new Date().toISOString(),
        };
        onLinkAdded(newLink);
        toast({
          description: (
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" />
              <span>Link saved and categorized as {result.category}.</span>
            </div>
          ),
        });
        form.reset();
      } else {
        setCategorizationResult(result);
      }
    } catch (error) {
      console.error('Categorization error:', error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error instanceof Error ? error.message : "There was a problem categorizing your link.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleManualCategorySelection = (category: string) => {
    if (!categorizationResult || !url) return;
    const newLink: SavedLink = {
        id: uuidv4(),
        url: url,
        title: categorizationResult.title,
        description: categorizationResult.description,
        creatorName: categorizationResult.creatorName,
        category: category,
        thumbnailUrl: categorizationResult.thumbnailUrl,
        createdAt: new Date().toISOString(),
    };
    onLinkAdded(newLink);
    toast({
      description: (
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" />
          <span>Link saved and categorized as {category}.</span>
        </div>
      ),
    });
    setCategorizationResult(null);
    setUrl('');
    setSelectedCategory('');
    setNewCategory('');
    setShowNewCategoryInput(false);
    form.reset();
  };

  const handleNewCategorySubmit = () => {
    if (!newCategory.trim()) {
      toast({
        variant: "destructive",
        description: "Please enter a category name.",
      });
      return;
    }
    handleManualCategorySelection(newCategory.trim());
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading">
            <Plus className="h-5 w-5" />
            Add New Link
          </CardTitle>
          <CardDescription>
            Paste a video link and we'll categorize it for you using AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start flex-col sm:flex-row gap-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        {...field} 
                        id="link-input" 
                        className="pl-10 h-11"
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full sm:w-auto h-11 shrink-0 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Add Link
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={!!categorizationResult} onOpenChange={() => {
        setCategorizationResult(null);
        setSelectedCategory('');
        setNewCategory('');
        setShowNewCategoryInput(false);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" />
              Choose Category
              </DialogTitle>
            <DialogDescription>
              {showNewCategoryInput 
                ? "Create a new category for this link."
                : `Select a category from existing ones, or create a new one. AI suggested: ${categorizationResult?.category}`}
            </DialogDescription>
          </DialogHeader>
          
          {!showNewCategoryInput ? (
            <div className="space-y-4 py-4">
              <Select value={selectedCategory} onValueChange={handleManualCategorySelection}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select from existing categories" />
                </SelectTrigger>
                <SelectContent className="min-w-[300px]">
                  {existingCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="cursor-pointer py-2.5">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => setShowNewCategoryInput(true)}
                className="w-full"
              >
                + Create New Category
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Input 
                placeholder="Enter new category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNewCategorySubmit();
                  }
                }}
                className="h-11"
                autoFocus
              />
            </div>
          )}

          <DialogFooter className="flex gap-2 justify-end">
            {showNewCategoryInput && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewCategoryInput(false);
                  setNewCategory('');
                }}
              >
                Back
              </Button>
            )}
            {showNewCategoryInput && (
              <Button 
                onClick={handleNewCategorySubmit}
                className="bg-primary hover:bg-primary/90"
              >
                Create & Save
              </Button>
            )}
            {!showNewCategoryInput && (
              <Button variant="outline" onClick={() => setCategorizationResult(null)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
