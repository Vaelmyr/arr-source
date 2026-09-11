interface TvShow {
    id: string;
    title: string;
    description?: string;

    imdbId?: string;

    providerName?: string;
    seasons?: Season[];
}

interface Season {
    id: string;
    number?: number;
    title?: string;

    episodes: Episode[];
}

interface Episode {
    id: string;
    number: number;
    title?: string;
    description?: string;
}
