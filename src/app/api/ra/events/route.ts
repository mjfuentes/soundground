import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import got from "got";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const artistId = searchParams.get("artistId");

  if (!artistId) {
    return NextResponse.json({ error: "Missing 'artistId' parameter" }, { status: 400 });
  }

  try {
    // Try GraphQL API first
    const graphqlUrl = "https://ra.co/graphql";
    
    const graphqlQuery = {
      operationName: "GET_ARTIST_EVENTS",
      variables: {
        slug: artistId,
      },
      query: `query GET_ARTIST_EVENTS($slug: String!) {
        artist(slug: $slug) {
          id
          name
          events {
            id
            title
            date
            startTime
            endTime
            venue {
              name
              address
            }
            area {
              name
              country {
                name
              }
            }
            path
          }
        }
      }`
    };

    const response = await got.post(graphqlUrl, {
      json: graphqlQuery,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Content-Type": "application/json",
      },
    }).json<any>();

    const events = response?.data?.artist?.events || [];
    
    const formattedEvents = events.map((event: any) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue?.name,
      address: event.venue?.address,
      city: event.area?.name,
      country: event.area?.country?.name,
      url: `https://ra.co${event.path}`,
    }));

    return NextResponse.json({ 
      events: formattedEvents,
      artistId 
    });
  } catch (error) {
    console.error("GraphQL error, trying HTML scraping:", error);
    
    // Fallback: Scrape the artist's page
    try {
      const artistUrl = `https://ra.co/dj/${artistId}`;
      const html = await got(artistUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }).text();

      const $ = cheerio.load(html);
      const events: Array<{
        title?: string;
        date?: string;
        venue?: string;
        city?: string;
        url?: string;
      }> = [];

      // Try to find event listings (RA.co structure may vary)
      $("li[class*='Event'], article[class*='Event'], [data-testid*='event']").each((_, element) => {
        const $el = $(element);
        
        const title = $el.find("h3, [class*='Title']").first().text().trim();
        const date = $el.find("time, [class*='Date']").first().text().trim();
        const venue = $el.find("[class*='Venue']").first().text().trim();
        const city = $el.find("[class*='Location'], [class*='City']").first().text().trim();
        const relativeUrl = $el.find("a[href*='/events/']").first().attr("href");
        const url = relativeUrl ? `https://ra.co${relativeUrl}` : undefined;

        if (title || date) {
          events.push({ title, date, venue, city, url });
        }
      });

      // Alternative: Look for any event links
      if (events.length === 0) {
        $("a[href*='/events/']").each((_, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          const relativeUrl = $el.attr("href");
          const url = relativeUrl ? `https://ra.co${relativeUrl}` : undefined;

          if (title && url && !events.some(e => e.url === url)) {
            events.push({ title, url });
          }
        });
      }

      return NextResponse.json({ 
        events: events.slice(0, 10),
        artistId,
        source: "scraping"
      });
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);
      return NextResponse.json(
        { error: "Failed to fetch events from RA.co", events: [] },
        { status: 200 }
      );
    }
  }
}

