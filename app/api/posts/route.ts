import { NextResponse } from "next/server";
import { createClient, Photo, Video } from "pexels";

// Initialize Pexels client
const apiKey = process.env.PEXELS_API_KEY || "";
const client = apiKey ? createClient(apiKey) : null;

interface NormalizedPost {
  id: string;
  type: "photo" | "video";
  user: {
    name: string;
    avatar: string;
    profileUrl: string;
  };
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  likes: number;
  commentsCount: number;
  timestamp: string;
}

// Clean mock items for fallback
const MOCK_PHOTOS = [
  {
    id: 1,
    photographer: "Jane Doe",
    photographer_url: "https://www.pexels.com",
    alt: "Beautiful starry night sky over mountain peaks.",
    src: {
      large2x: "https://images.pexels.com/photos/1252869/pexels-photo-1252869.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      small: "https://images.pexels.com/photos/1252869/pexels-photo-1252869.jpeg?auto=compress&cs=tinysrgb&w=150"
    },
    width: 940,
    height: 650
  },
  {
    id: 2,
    photographer: "John Smith",
    photographer_url: "https://www.pexels.com",
    alt: "Vibrant neon-lit urban street alleyway at midnight.",
    src: {
      large2x: "https://images.pexels.com/photos/161963/chicago-illinois-skyline-skyscraper-161963.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      small: "https://images.pexels.com/photos/161963/chicago-illinois-skyline-skyscraper-161963.jpeg?auto=compress&cs=tinysrgb&w=150"
    },
    width: 940,
    height: 650
  },
  {
    id: 3,
    photographer: "Alice Johnson",
    photographer_url: "https://www.pexels.com",
    alt: "Cinematic foggy pine forest path.",
    src: {
      large2x: "https://images.pexels.com/photos/4827/nature-forest-trees-fog.jpg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      small: "https://images.pexels.com/photos/4827/nature-forest-trees-fog.jpg?auto=compress&cs=tinysrgb&w=150"
    },
    width: 940,
    height: 650
  }
];

const MOCK_VIDEOS = [
  {
    id: 1,
    user: {
      name: "Nature Clips",
      url: "https://www.pexels.com"
    },
    image: "https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=650",
    video_files: [
      {
        link: "https://videos.pexels.com/video-files/2499611/2499611-hd_1920_1080_24fps.mp4",
        file_type: "video/mp4",
        quality: "hd"
      }
    ],
    width: 1920,
    height: 1080
  },
  {
    id: 2,
    user: {
      name: "Urban Explorer",
      url: "https://www.pexels.com"
    },
    image: "https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?auto=compress&cs=tinysrgb&w=650",
    video_files: [
      {
        link: "https://videos.pexels.com/video-files/853800/853800-hd_1920_1080_25fps.mp4",
        file_type: "video/mp4",
        quality: "hd"
      }
    ],
    width: 1920,
    height: 1080
  }
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageStr = searchParams.get("page") || "1";
    const page = parseInt(pageStr, 10);
    const perPage = 5;

    let posts: NormalizedPost[] = [];
    let videoPosts: NormalizedPost[] = [];

    if (client) {
      try {
        // Fetch curated photos
        const photosRes = await client.photos.curated({ page, per_page: perPage });
        if (photosRes && "photos" in photosRes) {
          posts = (photosRes.photos as Photo[]).map((photo) => ({
            id: `photo-${photo.id}-${page}`,
            type: "photo",
            user: {
              name: photo.photographer,
              avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(photo.photographer)}`,
              profileUrl: photo.photographer_url,
            },
            description: photo.alt || "A beautiful moment captured.",
            mediaUrl: photo.src.large2x,
            thumbnailUrl: photo.src.small,
            width: photo.width,
            height: photo.height,
            likes: Math.floor(Math.random() * 490) + 10,
            commentsCount: Math.floor(Math.random() * 45) + 5,
            timestamp: `${Math.floor(Math.random() * 23) + 1}h ago`,
          }));
        }

        // Fetch trending videos
        const videosRes = await client.videos.popular({ page, per_page: perPage });
        if (videosRes && "videos" in videosRes) {
          videoPosts = (videosRes.videos as Video[]).map((video) => {
            const file = video.video_files.find(
              (f) =>
                (f.file_type as string) === "video/mp4" &&
                (f.quality === "hd" || f.quality === "sd")
            ) || video.video_files[0];

            return {
              id: `video-${video.id}-${page}`,
              type: "video",
              user: {
                name: video.user.name,
                avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(video.user.name)}`,
                profileUrl: video.user.url,
              },
              description: `A stunning clip of high definition motion.`,
              mediaUrl: file ? file.link : "",
              thumbnailUrl: video.image,
              width: video.width,
              height: video.height,
              likes: Math.floor(Math.random() * 490) + 10,
              commentsCount: Math.floor(Math.random() * 45) + 5,
              timestamp: `${Math.floor(Math.random() * 23) + 1}h ago`,
            };
          });
        }
      } catch (err) {
        console.error("Pexels API fetch failed, falling back to mock data", err);
      }
    }

    // If Pexels failed or client was null, build response from mock fallback items
    if (posts.length === 0 && videoPosts.length === 0) {
      posts = MOCK_PHOTOS.map((photo) => ({
        id: `mock-photo-${photo.id}-${page}`,
        type: "photo",
        user: {
          name: photo.photographer,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(photo.photographer)}`,
          profileUrl: photo.photographer_url,
        },
        description: photo.alt,
        mediaUrl: photo.src.large2x,
        thumbnailUrl: photo.src.small,
        width: photo.width,
        height: photo.height,
        likes: Math.floor(Math.random() * 490) + 10,
        commentsCount: Math.floor(Math.random() * 45) + 5,
        timestamp: `${page}d ago`,
      }));

      videoPosts = MOCK_VIDEOS.map((video) => ({
        id: `mock-video-${video.id}-${page}`,
        type: "video",
        user: {
          name: video.user.name,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(video.user.name)}`,
          profileUrl: video.user.url,
        },
        description: `Stunning landscape video clip.`,
        mediaUrl: video.video_files[0].link,
        thumbnailUrl: video.image,
        width: video.width,
        height: video.height,
        likes: Math.floor(Math.random() * 490) + 10,
        commentsCount: Math.floor(Math.random() * 45) + 5,
        timestamp: `${page}d ago`,
      }));
    }

    // Interleave photos and videos
    const combined: NormalizedPost[] = [];
    const maxLength = Math.max(posts.length, videoPosts.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < posts.length) combined.push(posts[i]);
      if (i < videoPosts.length) combined.push(videoPosts[i]);
    }

    return NextResponse.json({ posts: combined });
  } catch (error) {
    console.error("API GET failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
