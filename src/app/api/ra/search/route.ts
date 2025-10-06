import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import got from "got";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ error: "Missing 'query' parameter" }, { status: 400 });
  }

  try {
    // RA.co uses GraphQL API for search
    const graphqlUrl = "https://ra.co/graphql";
    
    const graphqlQuery = {
      operationName: "GET_SEARCH_RESULTS",
      variables: {
        query: query,
        pageSize: 5,
        indices: ["ARTIST"]
      },
      query: `query GET_SEARCH_RESULTS($query: String!, $pageSize: Int, $indices: [String]) {
        search(query: $query, pageSize: $pageSize, indices: $indices) {
          artists {
            id
            name
            imagePath
            followers
            path
          }
        }
      }`
    };

    const response = await got.post(graphqlUrl, {
      json: graphqlQuery,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
      },
    }).json<any>();

    const artists = response?.data?.search?.artists || [];
    
    const results = artists.map((artist: any) => ({
      name: artist.name,
      url: `https://ra.co${artist.path}`,
      image: artist.imagePath ? `https://ra.co${artist.imagePath}` : undefined,
      followers: artist.followers,
    }));

    return NextResponse.json({ 
      results: results.slice(0, 5),
      query 
    });
  } catch (error) {
    console.error("Error searching RA.co:", error);
    
    // Fallback: Try HTML scraping
    try {
      const searchUrl = `https://ra.co/search?q=${encodeURIComponent(query)}`;
      const html = await got(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }).text();

      const $ = cheerio.load(html);
      const results: Array<{
        name: string;
        url: string;
        image?: string;
        followers?: number;
      }> = [];

      $("a[href*='/dj/']").each((_, element) => {
        const $el = $(element);
        const name = $el.text().trim();
        const relativeUrl = $el.attr("href");
        const url = relativeUrl ? `https://ra.co${relativeUrl}` : "";

        if (name && url && !results.some(r => r.url === url)) {
          results.push({ name, url });
        }
      });

      return NextResponse.json({ 
        results: results.slice(0, 5),
        query 
      });
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);
      return NextResponse.json(
        { error: "Failed to search RA.co", results: [] },
        { status: 200 }
      );
    }
  }
}

