<!--
    Purpose:
    Render game listing with publisher/category filters and client-side pagination.
-->
<script lang="ts">
    import GameCard from "./GameCard.svelte";
    import LoadingSkeleton from "./LoadingSkeleton.svelte";
    import ErrorMessage from "./ErrorMessage.svelte";
    import EmptyState from "./EmptyState.svelte";

    interface GameMeta {
        id: number;
        name: string;
    }

    interface Game {
        id: number;
        title: string;
        description: string;
        publisher?: GameMeta | null;
        category?: GameMeta | null;
        publisher_name?: string;
        category_name?: string;
    }

    let { games = $bindable([]) }: { games?: Game[] } = $props();
    let loading = $state(true);
    let error = $state<string | null>(null);
    let selectedPublisher = $state("all");
    let selectedCategory = $state("all");
    let hasFetched = $state(false);
    let currentPage = $state(1);

    const PAGE_SIZE = 6;

    const getPublisherName = (game: Game): string | null => game.publisher?.name ?? game.publisher_name ?? null;
    const getCategoryName = (game: Game): string | null => game.category?.name ?? game.category_name ?? null;

    const getPublisherValue = (game: Game): string | null => {
        if (game.publisher?.id) {
            return `id:${game.publisher.id}`;
        }
        const publisherName = getPublisherName(game);
        return publisherName ? `name:${publisherName}` : null;
    };

    const getCategoryValue = (game: Game): string | null => {
        if (game.category?.id) {
            return `id:${game.category.id}`;
        }
        const categoryName = getCategoryName(game);
        return categoryName ? `name:${categoryName}` : null;
    };

    let publisherOptions = $derived.by(() => {
        const optionMap = new Map<string, string>();
        for (const game of games) {
            const value = getPublisherValue(game);
            const label = getPublisherName(game);
            if (value && label) {
                optionMap.set(value, label);
            }
        }

        return Array.from(optionMap.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label));
    });

    let categoryOptions = $derived.by(() => {
        const optionMap = new Map<string, string>();
        for (const game of games) {
            const value = getCategoryValue(game);
            const label = getCategoryName(game);
            if (value && label) {
                optionMap.set(value, label);
            }
        }

        return Array.from(optionMap.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label));
    });

    let hasActiveFilters = $derived(selectedPublisher !== "all" || selectedCategory !== "all");

    let filteredGames = $derived.by(() =>
        games.filter((game) => {
            const publisherValue = getPublisherValue(game);
            const categoryValue = getCategoryValue(game);

            const publisherMatch = selectedPublisher === "all" || publisherValue === selectedPublisher;
            const categoryMatch = selectedCategory === "all" || categoryValue === selectedCategory;

            return publisherMatch && categoryMatch;
        })
    );

    let totalPages = $derived(Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE)));

    let paginatedGames = $derived.by(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        return filteredGames.slice(start, end);
    });

    let canGoPrevious = $derived(currentPage > 1);
    let canGoNext = $derived(currentPage < totalPages);

    const fetchGames = async () => {
        loading = true;
        error = null;
        try {
            const response = await fetch('/api/games');
            if(response.ok) {
                games = await response.json();
            } else {
                error = `Failed to fetch data: ${response.status} ${response.statusText}`;
            }
        } catch (err) {
            error = `Error: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
            loading = false;
        }
    };

    const clearFilters = (): void => {
        selectedPublisher = "all";
        selectedCategory = "all";
        currentPage = 1;
    };

    const goToPreviousPage = (): void => {
        if (canGoPrevious) {
            currentPage -= 1;
        }
    };

    const goToNextPage = (): void => {
        if (canGoNext) {
            currentPage += 1;
        }
    };

    // Reset to first page whenever filter state changes.
    $effect(() => {
        selectedPublisher;
        selectedCategory;
        currentPage = 1;
    });

    // Keep current page within valid bounds when result count changes.
    $effect(() => {
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
    });

    $effect(() => {
        if (!hasFetched) {
            hasFetched = true;
            void fetchGames();
        }
    });
</script>

<div>
    <h2 class="text-2xl font-medium mb-6 text-slate-100">Featured Games</h2>

    <div class="mb-6 p-4 rounded-xl border border-slate-700/60 bg-slate-800/40" data-testid="game-filters">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="publisher-filter" class="block text-sm font-medium text-slate-200 mb-2">Publisher</label>
                <select
                    id="publisher-filter"
                    class="w-full rounded-lg border border-slate-600 bg-slate-900/70 text-slate-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    bind:value={selectedPublisher}
                    data-testid="publisher-filter"
                >
                    <option value="all">All publishers</option>
                    {#each publisherOptions as option}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </select>
            </div>

            <div>
                <label for="category-filter" class="block text-sm font-medium text-slate-200 mb-2">Category</label>
                <select
                    id="category-filter"
                    class="w-full rounded-lg border border-slate-600 bg-slate-900/70 text-slate-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    bind:value={selectedCategory}
                    data-testid="category-filter"
                >
                    <option value="all">All categories</option>
                    {#each categoryOptions as option}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </select>
            </div>
        </div>

        {#if hasActiveFilters}
            <div class="mt-4 flex items-center justify-between gap-3">
                <p class="text-sm text-slate-300" data-testid="active-filter-summary">
                    Showing {filteredGames.length} result{filteredGames.length === 1 ? '' : 's'}
                </p>
                <button
                    type="button"
                    class="px-3 py-1.5 text-sm rounded-lg border border-slate-500 text-slate-100 hover:border-blue-400 hover:text-blue-300 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onclick={clearFilters}
                    data-testid="clear-filters-button"
                >
                    Clear filters
                </button>
            </div>
        {/if}
    </div>
    
    {#if loading}
        <LoadingSkeleton count={6} />
    {:else if error}
        <ErrorMessage error={error} />
    {:else if games.length === 0}
        <EmptyState message="No games available at the moment." />
    {:else if filteredGames.length === 0}
        <EmptyState message="No games match your current filters." />
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="games-grid">
            {#each paginatedGames as game (game.id)}
                <GameCard {game} />
            {/each}
        </div>

        <div class="mt-6 flex items-center justify-between gap-4" data-testid="pagination-controls">
            <button
                type="button"
                class="px-3 py-1.5 text-sm rounded-lg border border-slate-500 text-slate-100 hover:border-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:hover:border-slate-500 disabled:hover:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                onclick={goToPreviousPage}
                disabled={!canGoPrevious}
                data-testid="pagination-prev"
            >
                Previous
            </button>

            <p class="text-sm text-slate-300" data-testid="pagination-page-info">
                Page {currentPage} of {totalPages}
            </p>

            <button
                type="button"
                class="px-3 py-1.5 text-sm rounded-lg border border-slate-500 text-slate-100 hover:border-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:hover:border-slate-500 disabled:hover:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                onclick={goToNextPage}
                disabled={!canGoNext}
                data-testid="pagination-next"
            >
                Next
            </button>
        </div>
    {/if}
</div>