import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.query.agents.findMany({
      with: {
        skills: true,
        toolBindings: {
          with: {
            toolDefinition: true,
          },
        },
      },
      orderBy: (agents, { desc }) => [desc(agents.createdAt)],
    });
  }

  async findOne(id: string) {
    const agent = await this.db.query.agents.findFirst({
      where: eq(schema.agents.id, id),
      with: {
        skills: true,
        toolBindings: {
          with: {
            toolDefinition: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent với ID ${id} không tồn tại`);
    }

    return agent;
  }

  async create(createAgentDto: CreateAgentDto) {
    const { skills, toolIds, ...agentData } = createAgentDto;

    return this.db.transaction(async (tx) => {
      const [newAgent] = await tx
        .insert(schema.agents)
        .values({
          name: agentData.name,
          systemInstructions: agentData.systemInstructions,
          llmProvider: agentData.llmProvider ?? 'openai',
          llmModel: agentData.llmModel ?? 'gpt-4o',
          tier: agentData.tier ?? 'smart',
          isRouter: agentData.isRouter ?? false,
          maxSteps: agentData.maxSteps ?? 10,
          config: agentData.config ?? {},
          isActive: agentData.isActive ?? true,
        })
        .returning();

      if (skills && skills.length > 0) {
        await tx.insert(schema.agentSkills).values(
          skills.map((skill) => ({
            agentId: newAgent.id,
            name: skill.name,
            description: skill.description,
          })),
        );
      }

      if (toolIds && toolIds.length > 0) {
        await tx.insert(schema.agentToolBindings).values(
          toolIds.map((toolId) => ({
            agentId: newAgent.id,
            toolDefinitionId: toolId,
          })),
        );
      }

      return this.findOne(newAgent.id);
    });
  }

  async update(id: string, updateAgentDto: UpdateAgentDto) {
    // Check if agent exists
    await this.findOne(id);

    const { skills, toolIds, ...agentData } = updateAgentDto;

    return this.db.transaction(async (tx) => {
      // Update agent core properties
      await tx
        .update(schema.agents)
        .set({
          ...agentData,
          updatedAt: new Date(),
        })
        .where(eq(schema.agents.id, id));

      // Update skills if provided
      if (skills !== undefined) {
        // Clear existing skills
        await tx.delete(schema.agentSkills).where(eq(schema.agentSkills.agentId, id));
        // Insert new skills
        if (skills.length > 0) {
          await tx.insert(schema.agentSkills).values(
            skills.map((skill) => ({
              agentId: id,
              name: skill.name,
              description: skill.description,
            })),
          );
        }
      }

      // Update tool bindings if provided
      if (toolIds !== undefined) {
        // Clear existing tool bindings
        await tx.delete(schema.agentToolBindings).where(eq(schema.agentToolBindings.agentId, id));
        // Insert new tool bindings
        if (toolIds.length > 0) {
          await tx.insert(schema.agentToolBindings).values(
            toolIds.map((toolId) => ({
              agentId: id,
              toolDefinitionId: toolId,
            })),
          );
        }
      }

      return this.findOne(id);
    });
  }

  async remove(id: string) {
    const agent = await this.findOne(id);
    await this.db.delete(schema.agents).where(eq(schema.agents.id, id));
    return { success: true, message: `Đã xóa agent ${agent.name} thành công` };
  }
}
