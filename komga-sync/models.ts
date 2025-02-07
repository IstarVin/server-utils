export type StatusType = "ONGOING" | "HIATUS" | "COMPLETED" | "DROPPED";

export type MangaSchema = {
  title: string;
  artist: string;
  author: string;
  description: string;
  status: StatusType;
  genre: string[];
  thumbnailUrl: string;
};
