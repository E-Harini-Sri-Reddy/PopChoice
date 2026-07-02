import { openai, supabase } from "./config.js";
import movies from "./content.js";

async function createEmbedding(text) {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
    });

    return response.data[0].embedding;
}

async function seedDatabase() {

    console.log("Checking database...");

    const { count, error } = await supabase
        .from("movies")
        .select("*", {
            count: "exact",
            head: true
        });

    if (error) throw error;

    if (count > 0) {
        console.log("Database already seeded.");
        return;
    }

    console.log("Creating embeddings...");

    for (const movie of movies) {

        const embedding = await createEmbedding(movie.content);

        await supabase
            .from("movies")
            .insert({
                title: movie.title,
                release_year: Number(movie.releaseYear),
                content: movie.content,
                embedding
            });

        console.log(`Inserted ${movie.title}`);
    }

    console.log("Done!");
}

seedDatabase();