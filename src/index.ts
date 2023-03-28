import { Octokit } from '@octokit/rest';
import { extractRepositoryFullName } from './utilities';

/**
 * Returns the XP multiplier based on the number of repository stargazers.
 *
 * @param stargazers_count The number of stargazers the repository has.
 */
const getStargazersMultiplier = (stargazers_count = 0) => {
  if (stargazers_count < 20) {
    return 1;
  } else if (stargazers_count < 50) {
    return 2;
  } else if (stargazers_count < 200) {
    return 4;
  } else {
    return 8;
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
      per_page: 100,
    }),
    octokit.repos.listForUser({
      username: username,
      type: 'owner',
      per_page: 100,
    }),
  ]);

  let experience = 0;

  // Resolve the experience for repositories, where the user is a member
  if (!!memberRepositories?.data?.length) {
    experience += memberRepositories.data.reduce(
      (acc, { stargazers_count = 0 }) => {
        return acc + 1 * getStargazersMultiplier(stargazers_count);
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
        return acc + 1 * getStargazersMultiplier(stargazers_count);
      },
      0
    );
  }

  return experience;
};

/**
 * Calculates the experience gained for issues and pull requests the user authored.
 *
 * @param octokit Octokit instance
 * @param username Username for which to get the experience
 */
const getCombinedExperience = async (
  octokit: Octokit,
  username: string
) => {
  // Create requests for multiple pages
  const itemRequests = Array.from({ length: 10 }, (_, i) => i + 1).map(
    (page) => {
      return octokit.search.issuesAndPullRequests({
        q: `author:${username} is:issue is:pull-request`,
        per_page: 100,
        page,
      });
    }
  );

  // Await all item requests
  const items = await Promise.all(itemRequests).then((results) => {
    return results.flatMap((result) => result?.data?.items || []);
  });

  // Extract and deduplicate repository names
  const repositoryFullNames = items.reduce<string[]>((prev, current) => {
    const repositoryFullName = extractRepositoryFullName(
      current.repository_url
    );

    return prev.includes(repositoryFullName)
      ? prev
      : [...prev, repositoryFullName];
  }, []);

  // Fetch data for extracted repositories
  const repositories = await Promise.all(
    repositoryFullNames.map((repositoryFullName) => {
      const [owner, repo] = repositoryFullName.split('/');

      return octokit.repos.get({
        owner,
        repo,
      });
    })
  );

  // Create name - index map for easier access
  const repositoryNameIndexMap: Record<string, number> = {};
  repositoryFullNames.forEach((repositoryFullName, index) => {
    repositoryNameIndexMap[repositoryFullName] = index;
  });

  let experience = 0;

  for (const item of items) {
    const repositoryFullName = extractRepositoryFullName(
      item.repository_url
    );

    const repository =
      repositories[repositoryNameIndexMap[repositoryFullName]];

    experience +=
      1 * getStargazersMultiplier(repository.data.stargazers_count);
  }

  return experience;
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

  const [reposExperience, combinedExperience] = await Promise.all([
    getReposExperience(octokit, username),
    getCombinedExperience(octokit, username),
  ]);

  return Math.floor(reposExperience + combinedExperience);
};
