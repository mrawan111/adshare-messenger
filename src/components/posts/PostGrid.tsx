import { PostCard } from "./PostCard";

interface Post {
  id: string;
  image_url: string;
  description: string;
  created_at: string;
}

interface PostGridProps {
  posts: Post[];
  onDelete: (id: string) => void;
}

export function PostGrid({ posts, onDelete }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-6">
          <svg
            className="h-12 w-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
          No posts yet
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create your first advertising post to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          id={post.id}
          imageUrl={post.image_url}
          description={post.description}
          createdAt={post.created_at}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
