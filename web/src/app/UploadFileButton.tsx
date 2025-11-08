"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, useRef, useState } from "react";

export default function UploadFileButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    const files = e.target.files;
    if (files) {
      const file = files[0];
      const result = await fetch("/api/uploads/presigned-url", {
        method: "POST",
        body: JSON.stringify({
          contentType: "image/jpeg",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data: { url: string; key: string } = await result.json();
      if (data.url) {
        const s3UploadResult = await fetch(data.url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": "image/jpeg" },
        });
        if (!s3UploadResult.ok) throw new Error("S3 upload failed");
        const uploadResult = await fetch("/api/uploads", {
          method: "POST",
          body: JSON.stringify({
            title: file.name,
            s3_key: data.key,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
        const uploadData: {
          id: string;
          s3_key: string;
          title: string;
          created_at: string;
        } = await uploadResult.json();
        if (!uploadData.id) throw new Error("Database upload failed");
        queryClient.invalidateQueries({ queryKey: ["uploads"] });
      }
    }
    setLoading(false);
  };

  return (
    <section className="self-center">
      <button
        className="px-4 py-2 rounded-lg hover:bg-blue-400 transition-all duration-300 ease-in-out"
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "Just a moment..." : "Upload photo"}
      </button>
      <input
        onChange={handleChange}
        multiple={false}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg"
        hidden
      />
    </section>
  );
}
