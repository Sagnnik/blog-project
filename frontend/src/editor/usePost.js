import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { fetchPost, updatePost, uploadAsset } from "./utils";

export function usePost(postId) {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    // 1. Fetch Post
    const postQuery = useQuery({
        queryKey: ["post", postId],
        queryFn: async ({ signal }) => fetchPost({ getToken, postId, signal }),
        enabled: !!postId,
        staleTime: 1000 * 60 * 2,      
        gcTime: 1000 * 60 * 10,     
    });

    // 2. Save post fields
    const saveMutation = useMutation({
        mutationFn: async (payload) => updatePost({ getToken, postId, payload }),
        onSuccess: (data) => {
            queryClient.setQueryData(["post", postId], data);
        },
    });

    // 3. upload assets (image or html)
    const uploadAssetMutation = useMutation({
        mutationFn: async ({ formData, endpoint }) => uploadAsset({ getToken, formData, endpoint }),
    });

    return {
        postQuery,
        saveMutation,
        uploadAssetMutation,
        queryClient,
    };
}
