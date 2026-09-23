import { Module } from "@nestjs/common";
import { UserSeeder } from "./user.seeder";

@Module({
    providers:[UserSeeder]
})
export class SeederModule{}