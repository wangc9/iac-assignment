"use client";

import { useQuery } from "@tanstack/react-query";
import { uploadsOptions } from "./queryOptions";

export default function Gallery() {
  const { data } = useQuery(uploadsOptions);

  return (
    <ul className="grid grid-cols-1 md:grid-cols-3">
      {data &&
        data?.map((image) => (
          <li className="w-full h-full" key={image.id}>
            <img
              src={image.s3_key}
              alt={image.title}
              className="w-full h-full object-cover"
            />
          </li>
        ))}
    </ul>
  );
}
