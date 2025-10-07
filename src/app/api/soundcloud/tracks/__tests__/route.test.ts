/**
 * @jest-environment node
 */
import { GET } from "../route";
import { NextRequest } from "next/server";
import * as smartClient from "@/lib/soundcloud/smart-client";

jest.mock("@/lib/soundcloud/smart-client");

describe("/api/soundcloud/tracks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return tracks for a valid userId", async () => {
    const mockTracks = {
      collection: [
        {
          id: 123,
          title: "Test Track",
          permalink_url: "https://soundcloud.com/test/track",
          duration: 180000,
          playback_count: 1000,
          likes_count: 50,
          reposts_count: 10,
          comment_count: 5,
          user: {
            id: 456,
            username: "testuser",
            permalink_url: "https://soundcloud.com/testuser",
          },
        },
      ],
    };

    (smartClient.getTracks as jest.Mock).mockResolvedValue(mockTracks);

    const request = new NextRequest("http://localhost:3000/api/soundcloud/tracks?userId=456");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockTracks);
    expect(smartClient.getTracks).toHaveBeenCalledWith(456, 200);
  });

  it("should return 400 if userId is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/soundcloud/tracks");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Missing 'userId' parameter" });
  });

  it("should handle limit parameter", async () => {
    const mockTracks = { collection: [] };
    (smartClient.getTracks as jest.Mock).mockResolvedValue(mockTracks);

    const request = new NextRequest("http://localhost:3000/api/soundcloud/tracks?userId=456&limit=50");
    await GET(request);

    expect(smartClient.getTracks).toHaveBeenCalledWith(456, 50);
  });

  it("should return 500 on error", async () => {
    (smartClient.getTracks as jest.Mock).mockRejectedValue(new Error("API error"));

    const request = new NextRequest("http://localhost:3000/api/soundcloud/tracks?userId=456");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch tracks" });
  });
});

