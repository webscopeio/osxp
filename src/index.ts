import { Octokit } from '@octokit/rest';

/**
 * Calculates the experience gained for a single repository.
 *
 * @param stargazers_count The number of stargazers the repository has.
 */
const getRepoExperience = (stargazers_count = 0) => {
  if (stargazers_count < 20) {
    return stargazers_count;
  } else if (stargazers_count < 50) {
    return stargazers_count * 1.05;
  } else if (stargazers_count < 200) {
    return stargazers_count * 1.1;
  } else {
    return stargazers_count * 1.15;
  }
};

/**
 * Calculates the experience gained for repositories, where the user is
 * either a member or the owner.
 *
 * @param octokit Octokit instance
 * @param username Username for which to get the experience
 */
const getReposExperience = async (octokit: Octokit, username: string) => {
  const [memberRepositories, ownerRepositories] = await Promise.all([
    octokit.repos.listForUser({
      username: username,
      type: 'member',
      per_page: 50,
    }),
    octokit.repos.listForUser({
      username: username,
      type: 'owner',
      per_page: 50,
    }),
  ]);

  let experience = 0;

  // Resolve the experience for repositories, where the user is a member
  if (!!memberRepositories?.data?.length) {
    experience += memberRepositories.data.reduce(
      (acc, { stargazers_count = 0 }) => {
        return acc + getRepoExperience(stargazers_count);
      },
      0
    );
  }

  // Experience for repositories not owned by the user is halved
  experience *= 0.5;

  // Resolve the experience for repositories, where the user is the owner
  if (!!ownerRepositories?.data?.length) {
    experience += ownerRepositories.data.reduce(
      (acc, { stargazers_count = 0 }) => {
        return acc + getRepoExperience(stargazers_count);
      },
      0
    );
  }

  return experience;
};

/**
 * Calculates the experience gained for pull requests the user authored.
 *
 * @param octokit Octokit instance
 * @param username Username for which to get the experience
 */
const getPullRequestsExperience = async (
  octokit: Octokit,
  username: string
) => {
  const searchResult = await octokit.search.issuesAndPullRequests({
    q: `author:${username} is:pr`,
    per_page: 50,
  });

  return searchResult.data.items.length;
};

/**
 * Calculates the experience gained for issues the user authored.
 *
 * @param octokit Octokit instance
 * @param username Username for which to get the experience
 */
const getIssuesExperience = async (octokit: Octokit, username: string) => {
  const searchResult = await octokit.search.issuesAndPullRequests({
    q: `author:${username} is:issue`,
    per_page: 50,
  });

  return searchResult.data.items.length;
};

/**
 * Calculates an estimate of the open-source experience user gained based
 * on the public repositories, pull requests and issues.
 *
 * @param username Username for which to get the experience
 * @param accessToken Access token used to authorize requests
 */
export const getExperience = async (
  username: string,
  accessToken?: string
): Promise<number> => {
  const octokit = new Octokit({
    auth: accessToken,
  });

  const [reposExperience, pullRequestsExperience, issuesExperience] =
    await Promise.all([
      getReposExperience(octokit, username),
      getPullRequestsExperience(octokit, username),
      getIssuesExperience(octokit, username),
    ]);

  return Math.floor(
    reposExperience + pullRequestsExperience + issuesExperience
  );
};
