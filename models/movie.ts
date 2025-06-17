export interface RawMovie {
    id: string;
    title: string;
    year: number;
    genre: string[];
    director: string;
    cast: string[];
    synopsis: string;
    licensing: {
        contractId: string,
        partnerName: string
    }
};

export interface Movie extends Omit<RawMovie, 'licensing'> {
    embedding: number[];
}