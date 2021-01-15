export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type Mutation = {
  __typename?: 'Mutation';
  createHuman: Human;
};


export type MutationCreateHumanArgs = {
  newHuman: NewHuman;
};

export type Query = {
  __typename?: 'Query';
  apiVersion: Scalars['String'];
  human: Human;
};


export type QueryHumanArgs = {
  id: Scalars['String'];
};

export enum Episode {
  NewHope = 'NEW_HOPE',
  Empire = 'EMPIRE',
  Jedi = 'JEDI'
}

/** A humanoid creature in the Star Wars universe */
export type NewHuman = {
  name: Scalars['String'];
  appearsIn: Array<Episode>;
  homePlanet: Scalars['String'];
};

/** A humanoid creature in the Star Wars universe */
export type Human = {
  __typename?: 'Human';
  id: Scalars['String'];
  name: Scalars['String'];
  appearsIn: Array<Episode>;
  homePlanet: Scalars['String'];
};
