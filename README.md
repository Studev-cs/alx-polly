# Alx-Polly

Alx-Polly is a full-stack polling application built with Next.js, Supabase, and Tailwind CSS. It allows users to create, vote on, and manage polls.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/pius-aaron/alx-polly.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env.local` file:

`NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
`NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase project anonymous key.
`SUPABASE_SECRET_KEY`: Your Supabase project secret key.

## Running the Project

To run the development server, use the following command:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Running Tests

To run the tests, use the following command:

```bash
npm test
```

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework for building full-stack web applications.
- [Supabase](https://supabase.io/) - Open source Firebase alternative.
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework.
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript.
- [Jest](https://jestjs.io/) - JavaScript testing framework.
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Simple and complete testing utilities that encourage good testing practices.

## Project Structure

The project structure is as follows:

- `app/`: Contains the application's pages and layouts.
- `components/`: Contains the application's reusable components.
- `lib/`: Contains the application's utility functions and Supabase client.
- `__tests__/`: Contains the application's tests.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request