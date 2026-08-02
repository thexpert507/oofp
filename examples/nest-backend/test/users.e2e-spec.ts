import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as TE from "@oofp/core/task-either";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import type { UserRepository } from "../src/application/contracts";
import { AppModule } from "../src/app.module";
import { UserRepositoryError } from "../src/domain/registration";
import { TOKENS } from "../src/tokens";

const applications: INestApplication[] = [];

const createApp = async (repository?: UserRepository) => {
	const builder = Test.createTestingModule({ imports: [AppModule] });
	if (repository) builder.overrideProvider(TOKENS.UserRepository).useValue(repository);
	const moduleRef = await builder.compile();
	const app = moduleRef.createNestApplication();
	await app.init();
	applications.push(app);
	return app;
};

afterEach(async () => {
	await Promise.all(applications.splice(0).map((app) => app.close()));
});

describe("POST /users", () => {
	it("returns 201 and a public user on success", async () => {
		const app = await createApp();
		const response = await request(app.getHttpServer())
			.post("/users")
			.send({ name: "Ada Lovelace", email: "ada@example.com" })
			.expect(201);

		expect(response.body).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com" });
		expect(response.body.id).toEqual(expect.any(String));
		expect(response.body.tag).toBeUndefined();
	});

	it("returns 400 for invalid input", async () => {
		const app = await createApp();
		const response = await request(app.getHttpServer())
			.post("/users")
			.send({ name: "A", email: "invalid" })
			.expect(400);

		expect(response.body).toMatchObject({ field: "name" });
	});

	it("returns 400 for unexpected input fields", async () => {
		const app = await createApp();
		const response = await request(app.getHttpServer())
			.post("/users")
			.send({ name: "Ada Lovelace", email: "ada@example.com", role: "admin" })
			.expect(400);

		expect(response.body).toMatchObject({ field: "body" });
	});

	it("returns 409 when the email is already registered", async () => {
		const app = await createApp();
		const body = { name: "Ada Lovelace", email: "ada@example.com" };
		await request(app.getHttpServer()).post("/users").send(body).expect(201);
		const response = await request(app.getHttpServer()).post("/users").send(body).expect(409);

		expect(response.body.message).toContain("already registered");
	});

	it("returns a sanitized 500 response for repository failures", async () => {
		const error = UserRepositoryError.from(new Error("secret database details"));
		const repository: UserRepository = {
			findByEmail: () => TE.left(error),
			save: (user) => TE.right(user),
		};
		const app = await createApp(repository);
		const response = await request(app.getHttpServer())
			.post("/users")
			.send({ name: "Ada Lovelace", email: "ada@example.com" })
			.expect(500);

		expect(response.body.message).toBe("Unable to register user");
		expect(JSON.stringify(response.body)).not.toContain("secret database details");
	});
});
