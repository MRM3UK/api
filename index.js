
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const DATA_FILE = path.join(ROOT, "data", "books.json");

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
};

function response(res, status, data) {
  res.writeHead(status, HEADERS);
  res.end(JSON.stringify(data, null, 2));
}

function normalize(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

async function getBooks() {
  const content = await fs.readFile(DATA_FILE, "utf8");
  const books = JSON.parse(content);

  if (!Array.isArray(books)) {
    throw new Error("Invalid books.json format");
  }

  return books;
}

function getGenres(book) {
  if (Array.isArray(book.genres)) return book.genres;
  return book.genre ? [book.genre] : [];
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, HEADERS);
    return res.end();
  }

  if (req.method !== "GET") {
    return response(res, 405, {
      success: false,
      error: "Only GET requests are supported"
    });
  }

  try {
    const books = await getBooks();
    const url = new URL(
      req.url,
      `https://${req.headers.host || "localhost"}`
    );

    const pathname = decodeURIComponent(url.pathname)
      .replace(/\/+$/, "");

    const parts = pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";

    // API health
    if (last === "health") {
      return response(res, 200, {
        success: true,
        name: "BDeBooks Metadata API",
        version: "1.0.0",
        totalBooks: books.length
      });
    }

    // Authors
    if (last === "authors") {
      const authors = [
        ...new Set(books.map(b => b.author).filter(Boolean))
      ].sort((a, b) => a.localeCompare(b, "bn"));

      return response(res, 200, {
        success: true,
        total: authors.length,
        authors
      });
    }

    // Genres
    if (last === "genres" || last === "categories") {
      const genres = [
        ...new Set(books.flatMap(getGenres).filter(Boolean))
      ].sort((a, b) => a.localeCompare(b, "bn"));

      return response(res, 200, {
        success: true,
        total: genres.length,
        genres
      });
    }

    // Latest books
    if (last === "latest") {
      const latest = [...books]
        .sort((a, b) =>
          String(b.addedAt || "").localeCompare(
            String(a.addedAt || "")
          )
        )
        .slice(0, 20);

      return response(res, 200, {
        success: true,
        total: latest.length,
        books: latest
      });
    }

    // Individual book
    const bookIndex = parts.indexOf("books");

    if (
      bookIndex !== -1 &&
      parts.length > bookIndex + 1
    ) {
      const slug = last;

      const book = books.find(
        b => b.slug === slug || b.id === slug
      );

      if (!book) {
        return response(res, 404, {
          success: false,
          error: "Book not found"
        });
      }

      return response(res, 200, {
        success: true,
        book
      });
    }

    // Book search and filtering
    const search = normalize(
      url.searchParams.get("search") ||
      url.searchParams.get("q")
    );

    const author = normalize(
      url.searchParams.get("author")
    );

    const genre = normalize(
      url.searchParams.get("genre") ||
      url.searchParams.get("category")
    );

    const page = Math.max(
      1,
      parseInt(url.searchParams.get("page") || "1", 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(url.searchParams.get("limit") || "20", 10) || 20
      )
    );

    const sort = normalize(
      url.searchParams.get("sort") || "latest"
    );

    let filtered = books.filter(book => {
      const genres = getGenres(book);

      const searchable = [
        book.title,
        book.author,
        book.description,
        ...genres
      ].map(normalize);

      const matchesSearch =
        !search || searchable.some(v => v.includes(search));

      const matchesAuthor =
        !author || normalize(book.author).includes(author);

      const matchesGenre =
        !genre || genres.some(
          g => normalize(g).includes(genre)
        );

      return matchesSearch && matchesAuthor && matchesGenre;
    });

    if (sort === "title") {
      filtered.sort((a, b) =>
        normalize(a.title).localeCompare(normalize(b.title), "bn")
      );
    } else if (sort === "oldest") {
      filtered.sort((a, b) =>
        String(a.addedAt || "").localeCompare(
          String(b.addedAt || "")
        )
      );
    } else {
      filtered.sort((a, b) =>
        String(b.addedAt || "").localeCompare(
          String(a.addedAt || "")
        )
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);

    const results = filtered.slice(
      (page - 1) * limit,
      page * limit
    );

    return response(res, 200, {
      success: true,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      books: results
    });

  } catch (error) {
    console.error(error);

    return response(res, 500, {
      success: false,
      error: "Internal server error"
    });
  }
}
