/**
 * Extract the full repository name (owner/repo) from repository URL
 * returned by the GitHub API.
 *
 * @param repositoryUrl An URL containing the repository full name
 */
export const extractRepositoryFullName = (repositoryUrl: string) => {
  const segments = repositoryUrl.split('/');

  return `${segments[segments.length - 2]}/${
    segments[segments.length - 1]
  }`;
};
