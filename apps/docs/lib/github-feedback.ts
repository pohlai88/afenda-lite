import { docsEnv } from "@afenda/env/docs";
import { App, type Octokit } from "octokit";
import {
	type ActionResponse,
	type BlockFeedback,
	type PageFeedback,
	blockFeedback,
	pageFeedback,
} from "@/components/feedback/schema";

export const repo = "afenda-lite";
export const owner = "pohlai88";
export const DocsCategory = "Docs Feedback";

const MISSING_CREDENTIALS_MESSAGE =
	"Docs feedback requires GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY via @afenda/env/docs. See docs-V2/docs/feedback.md.";

function missingCategoryMessage(): string {
	return `Create a GitHub Discussion category named "${DocsCategory}" on ${owner}/${repo}.`;
}

function discussionTitleForPage(pageId: string): string {
	return `Feedback for ${pageId}`;
}

function requireAppCredentials(): {
	readonly appId: string;
	readonly privateKey: string;
} {
	const appId = docsEnv.GITHUB_APP_ID;
	const privateKey = docsEnv.GITHUB_APP_PRIVATE_KEY;
	if (!appId || !privateKey) {
		throw new Error(MISSING_CREDENTIALS_MESSAGE);
	}
	return { appId, privateKey };
}

let instance: Octokit | undefined;

async function getOctokit(): Promise<Octokit> {
	if (instance) {
		return instance;
	}

	const { appId, privateKey } = requireAppCredentials();
	const app = new App({
		appId,
		privateKey,
	});

	const { data } = await app.octokit.request(
		"GET /repos/{owner}/{repo}/installation",
		{
			owner,
			repo,
			headers: {
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	instance = await app.getInstallationOctokit(data.id);
	return instance;
}

interface RepositoryInfo {
	id: string;
	discussionCategories: {
		nodes: {
			id: string;
			name: string;
		}[];
	};
}

let cachedDestination: RepositoryInfo | undefined;

async function getFeedbackDestination(): Promise<RepositoryInfo> {
	if (cachedDestination) {
		return cachedDestination;
	}
	const octokit = await getOctokit();

	const {
		repository,
	}: {
		repository: RepositoryInfo;
	} = await octokit.graphql(`
  query {
    repository(owner: "${owner}", name: "${repo}") {
      id
      discussionCategories(first: 25) {
        nodes { id name }
      }
    }
  }
`);

	cachedDestination = repository;
	return repository;
}

export async function onPageFeedbackAction(
	feedback: PageFeedback,
): Promise<ActionResponse> {
	"use server";
	const parsed = pageFeedback.parse(feedback);
	const url = new URL(parsed.url);

	return createDiscussionThread(
		url.pathname,
		`[${parsed.opinion}] ${parsed.message}\n\n> Forwarded from user feedback.`,
	);
}

export async function onBlockFeedbackAction(
	feedback: BlockFeedback,
): Promise<ActionResponse> {
	"use server";
	const parsed = blockFeedback.parse(feedback);
	const url = new URL(parsed.url);
	url.hash = parsed.blockId;

	return createDiscussionThread(
		url.pathname,
		`> ${parsed.blockBody}\n\n${parsed.message}\n\n> [Forwarded from user feedback](${url.href}).`,
	);
}

async function createDiscussionThread(
	pageId: string,
	body: string,
): Promise<ActionResponse> {
	const octokit = await getOctokit();
	const destination = await getFeedbackDestination();
	const category = destination.discussionCategories.nodes.find(
		(node) => node.name === DocsCategory,
	);

	if (!category) {
		throw new Error(missingCategoryMessage());
	}

	const title = discussionTitleForPage(pageId);
	const queryResult: {
		search: {
			nodes: { id: string; title: string; url: string }[];
		};
	} = await octokit.graphql(`
          query {
            search(type: DISCUSSION, query: ${JSON.stringify(`"${title}" in:title repo:${owner}/${repo} author:@me`)}, first: 10) {
              nodes {
                ... on Discussion { id, title, url }
              }
            }
          }`);

	const discussion = queryResult.search.nodes.find(
		(item) => item.title === title,
	);

	if (discussion) {
		const result: {
			addDiscussionComment: {
				comment: { id: string; url: string };
			};
		} = await octokit.graphql(`
            mutation {
              addDiscussionComment(input: { body: ${JSON.stringify(body)}, discussionId: "${discussion.id}" }) {
                comment { id, url }
              }
            }`);

		return {
			githubUrl: result.addDiscussionComment.comment.url,
		};
	}

	const result: {
		createDiscussion: {
			discussion: { id: string; url: string };
		};
	} = await octokit.graphql(`
            mutation {
              createDiscussion(input: { repositoryId: "${destination.id}", categoryId: "${category.id}", body: ${JSON.stringify(body)}, title: ${JSON.stringify(title)} }) {
                discussion { id, url }
              }
            }`);

	return {
		githubUrl: result.createDiscussion.discussion.url,
	};
}
