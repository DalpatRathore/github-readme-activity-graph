import axios from 'axios';
import * as dotenv from 'dotenv';
import {
  query,
  userDetails,
  week,
  contributionCount,
} from '../interfaces/interface';
import { fetchContribution, fetcher, gqlQuery } from '../types/types';

dotenv.config();

//GraphQl query to get everyday contributions as a response
export const graphqlQuery: gqlQuery = (username: string) => {
  return {
    query: `
      query userInfo($LOGIN: String!) {
       user(login: $LOGIN) {
         name
         contributionsCollection {
           contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                }
              }
            }
          }
        }
      },
    `,
    variables: {
      LOGIN: username,
    },
  };
};

const token: string | undefined = process.env.TOKEN;

const headers = {
  Authorization: `bearer ${token}`,
};

//Fetching data from GitHub GraphQl API
export const fetch: fetcher = (data: query) =>
  axios({
    url: 'https://api.github.com/graphql',
    method: 'POST',
    headers,
    data,
  });

const getContrubutionDates = () => {
  const days = [];
  for (
    const date = new Date();
    days.length < 31;
    date.setDate(date.getUTCDate() - 1)
  ) {
    const current = new Date(date);
    days.push(
      current.toLocaleString('default', { month: 'short' }) +
        ' ' +
        current.getUTCDate().toString()
    );
  }

  return days.reverse();
};

export const fetchContributions: fetchContribution = async (
  username: string,
  graphqlQuery: gqlQuery, //Dependency Injection
  fetch: fetcher
) => {
  try {
    const apiResponse = await fetch(graphqlQuery(username));
    if (apiResponse.data.data.user === null)
      return `Can't fetch any contribution. Please check your username 😬`;
    else {
      const userData: userDetails = {
        contributions: [],
        contribution_dates: getContrubutionDates(),
        name: apiResponse.data.data.user.name,
      };
      //filtering the week data from API response
      const weeks: week[] =
        apiResponse.data.data.user.contributionsCollection.contributionCalendar
          .weeks;

      const contributions: number[] = [];
      //slicing last 6 weeks
      weeks.slice(weeks.length - 6, weeks.length).map((week: week) =>
        week.contributionDays.map((contributionCount: contributionCount) => {
          contributions.push(contributionCount.contributionCount);
        })
      );

      // get 31 days contributions
      for (let i = contributions.length - 31; i < contributions.length; i++) {
        userData.contributions.push(contributions[i]);
      }

      return userData;
    }
  } catch (error) {
    return error;
  }
};