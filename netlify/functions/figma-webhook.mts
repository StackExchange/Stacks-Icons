export default async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    // Validate Figma webhook passcode (set when registering the webhook in Figma)
    const passcode = process.env["FIGMA_WEBHOOK_PASSCODE"];
    if (!passcode || body["passcode"] !== passcode) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Only act on library publish events
    if (body["event_type"] !== "LIBRARY_PUBLISH") {
        return new Response("OK", { status: 200 });
    }

    const githubToken = process.env["GITHUB_PAT"];
    if (!githubToken) {
        return new Response("Missing GITHUB_PAT", { status: 500 });
    }

    const response = await fetch(
        "https://api.github.com/repos/StackExchange/Stacks-Icons/dispatches",
        {
            method: "POST",
            headers: {
                "Authorization": `token ${githubToken}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                event_type: "figma-sync",
                client_payload: {
                    file_key: body["file_key"],
                    triggered_at: new Date().toISOString(),
                    triggered_by: (body["triggered_by"] as { handle?: string } | undefined)?.handle ?? null,
                    description: (body["description"] as string | undefined) ?? null,
                },
            }),
        }
    );

    if (!response.ok) {
        return new Response("Failed to trigger workflow", { status: 500 });
    }

    return new Response("OK", { status: 200 });
};
