
import * as React from "react";
import { Search } from "lucide-react";
import { Card, Button, Spinner, Input, TextField, toast } from "@heroui/react";
import { useTranslation } from "react-i18next";

interface SearchResult {
  id: string;
  content: string;
  chunkIndex: number;
  distance: number;
}

interface SearchSandboxProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
}

export function SearchSandbox({ onSearch }: SearchSandboxProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  const handleSearchTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
    } catch (err) {
      toast.danger(t("knowledge.alert.searchFailed"));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card className="bg-content1 border border-default-150 p-6 rounded-xl space-y-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Search className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          {t("knowledge.search.title")}
        </h2>
        <p className="text-[10px] text-default-455">
          {t("knowledge.search.subtitle")}
        </p>
      </div>

      <form className="flex w-full items-start gap-2" onSubmit={handleSearchTest}>
        <TextField
          aria-label={t("knowledge.search.placeholder")}
          className="flex-1"
          value={searchQuery}
          onChange={setSearchQuery}
        >
          <Input
            className="w-full text-foreground"
            placeholder={t("knowledge.search.placeholder")}
          />
        </TextField>
        <Button
          isIconOnly
          className="cursor-pointer shrink-0"
          isDisabled={searching}
          size="md"
          type="submit"
          variant="secondary"
        >
          {searching ? (
            <Spinner color="current" size="sm" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Search result items */}
      <div className="space-y-3 pt-2 max-h-[350px] overflow-y-auto pr-1">
        {searchResults.map((result) => {
          const similarity = (1 - result.distance) * 100;

          return (
            <div
              key={result.id}
              className="p-3 bg-default-50 border border-default-150 rounded-lg space-y-2 text-xs leading-relaxed"
            >
              <div className="flex items-center justify-between border-b border-default-150 pb-1.5 text-[10px]">
                <span className="font-semibold text-purple-600 dark:text-purple-400 font-mono">
                  Chunk #{result.chunkIndex}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {similarity.toFixed(1)}% {t("knowledge.search.match")}
                </span>
              </div>
              <p className="text-default-600 font-mono text-[10px] break-words">
                {result.content}
              </p>
            </div>
          );
        })}
        {searchResults.length === 0 && !searching && (
          <p className="text-xs text-default-455 italic text-center py-8">
            {t("knowledge.search.empty")}
          </p>
        )}
      </div>
    </Card>
  );
}
