"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface Post {
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

// Sub-component to handle video playing/pausing when in viewport
function PostVideo({ src, poster }: { src: string; poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(video);
    return () => {
      observer.unobserve(video);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className="w-full rounded-2xl max-h-[500px] bg-black object-contain border border-zinc-200/10 shadow-inner"
      controls
      loop
      muted
      playsInline
    />
  );
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string[]>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>(
    {},
  );
  const [expandedComments, setExpandedComments] = useState<
    Record<string, boolean>
  >({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loaderRef = useRef<HTMLDivElement>(null);

  // Use refs to avoid state-cascading triggers inside useEffect
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const pageRef = useRef(page);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // Fetch posts from server API proxy
  const fetchPosts = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?page=${pageNum}`);
      const data = await res.json();
      if (data.posts && data.posts.length > 0) {
        setPosts((prev) => {
          // Avoid duplicate posts by checking IDs
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = data.posts.filter(
            (p: Post) => !existingIds.has(p.id),
          );
          return [...prev, ...newPosts];
        });
        setPage(pageNum);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load posts", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Initial load - triggered asynchronously to prevent cascading renders
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPosts(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchPosts]);

  // Infinite Scroll Trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !loadingRef.current
        ) {
          fetchPosts(pageRef.current + 1);
        }
      },
      { threshold: 0.1 },
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [fetchPosts]);

  // Handle Like Toggle
  const handleLike = (postId: string) => {
    const isLiked = likedPosts[postId];
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const currentCount =
      likesCount[postId] !== undefined ? likesCount[postId] : post.likes;
    setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
    setLikesCount((prev) => ({
      ...prev,
      [postId]: isLiked ? currentCount - 1 : currentCount + 1,
    }));
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    const text = newCommentText[postId]?.trim();
    if (!text) return;

    setComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), text],
    }));
    setNewCommentText((prev) => ({ ...prev, [postId]: "" }));
  };

  // Copy Link (Share)
  const handleShare = (postId: string) => {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/#post-${postId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setToastMessage("Post link copied to clipboard!");
      setTimeout(() => setToastMessage(null), 2500);
    });
  };

  const getCommentsList = (post: Post) => {
    const localComments = comments[post.id] || [];
    // Start with 2 initial mock comments if not present
    const defaultComments = [
      `Wow, this ${post.type} is absolutely amazing!`,
      "Great composition and color grading here.",
    ];
    return [...defaultComments, ...localComments];
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-16 md:pb-0">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs md:text-sm font-semibold py-2.5 px-5 rounded-full shadow-lg border border-white/10 dark:border-black/10 animate-fade-in animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo & Search */}
          <div className="flex items-center gap-3 w-1/3">
            <span className="text-2xl font-bold tracking-tight bg-linear-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent select-none cursor-pointer">
              Network
            </span>
            <div className="hidden md:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full w-60 border border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-zinc-950 transition-all">
              <svg
                className="w-4 h-4 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search Network..."
                className="bg-transparent text-xs w-full focus:outline-none placeholder-zinc-500 text-zinc-700 dark:text-zinc-300"
              />
            </div>
          </div>

          {/* Nav Tabs (Desktop) */}
          <div className="hidden md:flex items-center justify-center gap-8 w-1/3 h-full">
            <button className="flex items-center justify-center h-full border-b-2 border-blue-600 px-6 text-blue-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </button>
            <button className="flex items-center justify-center h-full border-b-2 border-transparent px-6 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button className="flex items-center justify-center h-full border-b-2 border-transparent px-6 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-end gap-3 w-1/3">
            <button className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <button className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:opacity-90 transition">
              <Image
                src="https://api.dicebear.com/7.x/adventurer/svg?seed=PWAUser"
                alt="User Avatar"
                width={36}
                height={36}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-6 py-6">
        {/* Left Sidebar (Desktop Only) */}
        <aside className="hidden md:flex flex-col gap-4 sticky top-20 h-[calc(100vh-120px)] overflow-y-auto">
          {/* User Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 cursor-pointer transition">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <Image
                src="https://api.dicebear.com/7.x/adventurer/svg?seed=PWAUser"
                alt="User Avatar"
                width={36}
                height={36}
              />
            </div>
            <span className="font-semibold text-sm">PWA User</span>
          </div>

          {/* Left Navigation Links */}
          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-sm font-medium w-full text-left transition">
              <span className="text-blue-500">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </span>
              Friends
            </button>
            <button className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-sm font-medium w-full text-left transition">
              <span className="text-indigo-500">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
              Groups
            </button>
            <button className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-sm font-medium w-full text-left transition">
              <span className="text-red-500">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
                </svg>
              </span>
              Watch
            </button>
            <button className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-sm font-medium w-full text-left transition">
              <span className="text-amber-500">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />
                </svg>
              </span>
              Saved
            </button>
          </nav>
        </aside>

        {/* Feed (Middle Columns 2 & 3) */}
        <main className="col-span-1 md:col-span-2 flex flex-col gap-6">
          {/* Horizontal Stories bar */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {[
              {
                name: "John Doe",
                avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=John",
              },
              {
                name: "Alice Green",
                avatar:
                  "https://api.dicebear.com/7.x/adventurer/svg?seed=Alice",
              },
              {
                name: "Bob Miller",
                avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Bob",
              },
              {
                name: "Emma Watson",
                avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Emma",
              },
              {
                name: "David Beck",
                avatar:
                  "https://api.dicebear.com/7.x/adventurer/svg?seed=David",
              },
            ].map((story, i) => (
              <div
                key={i}
                className="shrink-0 w-24 h-40 relative rounded-2xl overflow-hidden snap-start cursor-pointer hover:scale-[1.02] transition shadow border border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800"
              >
                <div className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full border-2 border-blue-500 overflow-hidden bg-white">
                  <Image
                    src={story.avatar}
                    alt="Avatar"
                    width={32}
                    height={32}
                  />
                </div>
                <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent z-0" />
                {/* Background placeholder image for stories */}
                <Image
                  src={`https://images.pexels.com/photos/1252869/pexels-photo-1252869.jpeg?auto=compress&cs=tinysrgb&w=100&h=200&dpr=1`}
                  alt="Story background"
                  fill
                  className="object-cover"
                />
                <span className="absolute bottom-2 left-2 right-2 text-[10px] font-bold text-white truncate z-10">
                  {story.name}
                </span>
              </div>
            ))}
          </div>

          {/* What's on your mind? card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <Image
                  src="https://api.dicebear.com/7.x/adventurer/svg?seed=PWAUser"
                  alt="User Avatar"
                  width={36}
                  height={36}
                />
              </div>
              <input
                type="text"
                placeholder="What's on your mind, PWA User?"
                className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 transition cursor-pointer text-xs md:text-sm py-2.5 px-4 rounded-full w-full focus:outline-none text-zinc-700 dark:text-zinc-300"
              />
            </div>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 font-semibold text-xs md:text-sm">
              <button className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <span className="text-red-500">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2z" />
                  </svg>
                </span>
                Live Video
              </button>
              <button className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <span className="text-green-500">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                </span>
                Photo/Video
              </button>
              <button className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <span className="text-yellow-500">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
                  </svg>
                </span>
                Feeling
              </button>
            </div>
          </div>

          {/* Posts list */}
          <div className="flex flex-col gap-6">
            {posts.map((post) => {
              const isLiked = likedPosts[post.id];
              const likes =
                likesCount[post.id] !== undefined
                  ? likesCount[post.id]
                  : post.likes;
              const isCommentsOpen = expandedComments[post.id];

              return (
                <article
                  key={post.id}
                  id={`post-${post.id}`}
                  className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <a
                        href={post.user.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:opacity-90"
                      >
                        <Image
                          src={post.user.avatar}
                          alt="User avatar"
                          width={40}
                          height={40}
                        />
                      </a>
                      <div className="flex flex-col">
                        <a
                          href={post.user.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-sm hover:underline cursor-pointer"
                        >
                          {post.user.name}
                        </a>
                        <span className="text-[10px] text-zinc-500 font-semibold">
                          {post.timestamp}
                        </span>
                      </div>
                    </div>
                    <button className="text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-full transition">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Card Description */}
                  <div className="px-4 pb-3">
                    <p className="text-zinc-800 dark:text-zinc-200 text-xs md:text-sm font-medium leading-relaxed">
                      {post.description}
                    </p>
                  </div>

                  {/* Card Media */}
                  <div className="w-full relative bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
                    {post.type === "video" ? (
                      <PostVideo
                        src={post.mediaUrl}
                        poster={post.thumbnailUrl}
                      />
                    ) : (
                      <div className="w-full relative min-h-[300px] md:min-h-[400px]">
                        <Image
                          src={post.mediaUrl}
                          alt={post.description}
                          fill
                          sizes="(max-width: 768px) 100vw, 650px"
                          className="object-cover cursor-pointer hover:brightness-[0.98] transition"
                        />
                      </div>
                    )}
                  </div>

                  {/* Social Counts Info */}
                  <div className="flex items-center justify-between px-4 py-2.5 text-zinc-500 text-[11px] font-semibold border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
                      <span className="flex items-center justify-center w-4 h-4 bg-blue-500 rounded-full text-white text-[9px]">
                        👍
                      </span>
                      <span>{likes} likes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() =>
                          setExpandedComments((prev) => ({
                            ...prev,
                            [post.id]: !isCommentsOpen,
                          }))
                        }
                      >
                        {getCommentsList(post).length} comments
                      </span>
                      <span>12 shares</span>
                    </div>
                  </div>

                  {/* Like / Comment / Share Action Bar */}
                  <div className="flex items-center justify-between px-2 py-1 text-zinc-600 dark:text-zinc-400 font-semibold text-xs md:text-sm">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition active:scale-95 ${
                        isLiked ? "text-blue-600" : ""
                      }`}
                    >
                      <span>👍</span>
                      Like
                    </button>
                    <button
                      onClick={() =>
                        setExpandedComments((prev) => ({
                          ...prev,
                          [post.id]: !isCommentsOpen,
                        }))
                      }
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
                    >
                      <span>💬</span>
                      Comment
                    </button>
                    <button
                      onClick={() => handleShare(post.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
                    >
                      <span>🚀</span>
                      Share
                    </button>
                  </div>

                  {/* Expandable Comments Tray */}
                  {isCommentsOpen && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
                      {/* Comments List */}
                      <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
                        {getCommentsList(post).map((comm, idx) => (
                          <div key={idx} className="flex gap-2.5 items-start">
                            <div className="w-7 h-7 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0">
                              <Image
                                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=User-${idx}`}
                                alt="User avatar"
                                width={28}
                                height={28}
                              />
                            </div>
                            <div className="bg-zinc-200/60 dark:bg-zinc-800/80 px-3 py-1.5 rounded-2xl flex flex-col max-w-[85%]">
                              <span className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100">
                                Anonymous User
                              </span>
                              <p className="text-[12px] text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                                {comm}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Comment Input */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                          <Image
                            src="https://api.dicebear.com/7.x/adventurer/svg?seed=PWAUser"
                            alt="User avatar"
                            width={32}
                            height={32}
                          />
                        </div>
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 px-3.5 py-2 rounded-full w-full border border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-zinc-950 transition-all">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={newCommentText[post.id] || ""}
                            onChange={(e) =>
                              setNewCommentText((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddComment(post.id);
                            }}
                            className="bg-transparent text-xs w-full focus:outline-none text-zinc-700 dark:text-zinc-300 placeholder-zinc-500"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="text-blue-600 hover:text-blue-500 font-semibold text-xs ml-2 cursor-pointer transition"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Skeleton Loaders / Loader Sentinel */}
          <div ref={loaderRef} className="py-8 flex justify-center">
            {loading && (
              <div className="flex flex-col gap-4 w-full">
                {/* Skeleton Post Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 animate-pulse flex flex-col gap-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                    <div className="flex flex-col gap-2 w-1/3">
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                      <div className="h-2 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                    </div>
                  </div>
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-3/4" />
                  <div className="h-60 bg-zinc-200 dark:bg-zinc-800 rounded-2xl w-full" />
                </div>
              </div>
            )}
            {!hasMore && (
              <span className="text-zinc-500 text-xs md:text-sm font-semibold py-4 select-none">
                You&apos;re all caught up! No more posts to load.
              </span>
            )}
          </div>
        </main>

        {/* Right Sidebar (Desktop Only) */}
        <aside className="hidden md:flex flex-col gap-6 sticky top-20 h-[calc(100vh-120px)] overflow-y-auto">
          {/* Sponsors Section */}
          <div className="flex flex-col gap-3">
            <span className="text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
              Sponsored
            </span>
            <div className="flex gap-3 items-center hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 p-1.5 rounded-xl cursor-pointer transition">
              <div className="w-20 h-12 relative rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                <Image
                  src="https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?auto=compress&cs=tinysrgb&w=150"
                  alt="Sponsor ad"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-xs leading-none">
                  Travel Chicago
                </span>
                <span className="text-[10px] text-zinc-500 leading-none">
                  chicago-trips.com
                </span>
              </div>
            </div>
          </div>

          {/* Contacts Section */}
          <div className="flex flex-col gap-3">
            <span className="text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
              Contacts
            </span>
            {[
              {
                name: "John Doe",
                avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=John",
              },
              {
                name: "Alice Green",
                avatar:
                  "https://api.dicebear.com/7.x/adventurer/svg?seed=Alice",
              },
              {
                name: "Bob Miller",
                avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Bob",
              },
              {
                name: "Emma Watson",
                avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Emma",
              },
            ].map((contact, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 cursor-pointer transition"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white">
                  <Image
                    src={contact.avatar}
                    alt="Avatar"
                    width={32}
                    height={32}
                  />
                  <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500 border border-white dark:border-zinc-900" />
                </div>
                <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  {contact.name}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 md:hidden flex justify-around items-center h-12 shadow-lg">
        <button className="text-blue-600 flex items-center justify-center p-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>
        <button className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center p-2">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
        <button className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center p-2">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
        <button className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center p-2">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
        <div className="w-6 h-6 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 cursor-pointer">
          <Image
            src="https://api.dicebear.com/7.x/adventurer/svg?seed=PWAUser"
            alt="User Avatar"
            width={24}
            height={24}
          />
        </div>
      </footer>
    </div>
  );
}
