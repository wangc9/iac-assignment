import { queryOptions } from "@tanstack/react-query";

export const uploadsOptions = queryOptions({
  queryKey: ["uploads"],
  queryFn: async () => {
    const response = await fetch("/api/uploads");

    return response.json() as Promise<
      {
        id: string;
        s3_key: string;
        title: string;
        created_at: string;
      }[]
    >;
  },
});
