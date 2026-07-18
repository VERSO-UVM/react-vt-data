"use client"

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Modal,
  Stack,
  Group,
  Image
} from "@mantine/core";
import { motion } from "motion/react";
import { ArrowUpRightIcon } from "@phosphor-icons/react";


// ---------------------------------------------------------------------------
// Team data (Vermont Data Collaborative — uvm.edu/ruralpartnerships/vermont-data-collaborative)
// ---------------------------------------------------------------------------

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
}

const TEAM: TeamMember[] = [
  {
    name: "Emma Spett",
    role: "Engagement Initiatives Coordinator",
    bio: "Emma is the Engagement Initiatives Coordinator at UVM's Leahy Institute for Rural Partnerships, where she oversees programming related to community-university partnerships in support of data governance, rural capacity building, and community resilience. She is also a PhD candidate in UVM's Department of Community Development and Applied Economics and teaches in the Master of Public Administration program. Emma lives in Jamaica, Vermont, where she owns and operates a restaurant and inn with her partner.",
    image: "/images/our-team/emma_spett_headshot.jpg",
  },
  {
    name: "Fitzwilliam Keenan-Koch",
    role: "Data Scientist, VERSO & Leahy Center for Rural Studies",
    bio: "Fitz is a rising Master's student in Complex Systems and Data Science, leveraging data visualization and accessible analysis for VERSO and the Leahy Center for Rural Studies to improve living conditions across Vermont. He also has a background in technical writing and agricultural work, and has lived in Burlington for the past four years. Outside of work, you'll find him biking, skiing, hiking, or playing guitar in forests and bars across the state.",
    image: "/images/our-team/Fitz_KeenanKoch_headshot.jpg",
  },
  {
    name: "Ian Sargent",
    role: "Data Scientist, Leahy Center for Rural Studies",
    bio: "Ian serves as the Data Specialist with the Open Research Community Accelerator (ORCA), a program that enables undergraduate students to contribute to community-engaged projects. As an analyst, he develops a community-focused tool that combines Census, zoning, infrastructure, and flood data to inform Vermont towns on their housing and policy priorities. Ian is also a UVM undergraduate majoring in Statistics with minors in Psychology and Mathematics.",
    image: "/images/our-team/Ian_Sargent_headshot.jpg",
  },
  {
    name: "Michael Moser",
    role: "Operations Director, Center for Rural Studies",
    bio: "Michael (he/him) is operations director at the Center for Rural Studies (CRS) at the University of Vermont and coordinates the State's Census State Data Center. He has a particular interest in population demographics, including wellbeing indicators, and enjoys providing data trainings, conducting outreach, and building networks. He has extensive experience designing and implementing qualitative and quantitative research projects, from data collection through analysis and reporting.",
    image: "/images/our-team/Michael_Moser_headshot.jpg",
  },
  {
    name: "Kendall Fortney",
    role: "Program Director, VERSO",
    bio: "Kendall Fortney is the Program Director of the Vermont Research Open Source Program Office (VERSO) at the University of Vermont, where he works with faculty, staff, students, and the local community to advance the open-source ecosystem. Through the ORCA program, Kendall leads efforts to foster innovation, research, and community engagement via student-led open-source projects. He previously served as the inaugural Fellow at the Vermont Center for Geographic Information and has organized the Burlington Data Scientist Meetup, GeoDatSci 2018, and PyData Vermont 2024.",
    image: "/images/our-team/Kendall-Fortney_headshot.jpg",
  },
  {
    name: "Braden Lynn",
    role: "Research & Policy Intern",
    bio: "Braden is a Research and Policy Intern at the Leahy Institute for Rural Partnerships, working primarily with the Vermont Data Collaborative to address public challenges across Vermont. Through the Institute's partnership with the Vermont Policy Institute, Braden works to expand public access to the data that policymakers, businesses, and organizations need for informed decision-making, with an eye toward more reliable policy, stable investment, and a more transparent democracy in the state.",
    image: "/images/our-team/Braden_Lynn_headshot.jpg",
  },
  {
    name: "Isabelle Serrano",
    role: "Communication Lead, Vermont Data Collaborative",
    bio: "Isabelle is a data communication enthusiast interested in the intersection of public policy and community action. She is a senior undergraduate at UVM studying Website and Information Resources Design. She serves as Communication Lead for the Vermont Data Collaborative, as well as Manuscript Design Assistant under Professor Asim Zia, a Project Intern at the Center for Rural Studies, and Fundraising Officer for the UVM Nordic Ski Club.",
    image: "/images/our-team/Isabelle_Serrano_headshot.jpg",
  },
];

// ---------------------------------------------------------------------------
// Team member card
// ---------------------------------------------------------------------------

function TeamCard({
  member,
  onSelect,
}: {
  member: TeamMember;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
 
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onSelect}
      style={{ cursor: "pointer" }}
    >
      <Stack gap="xs">
        <div style={{ position: "relative" }}>
          <Image
            src={member.image}
            alt={member.name}
            radius="md"
            h={260}
            w="100%"
            fit="cover"
            fallbackSrc="https://placehold.co/400x400?text=No+Image"
            style={{ backgroundColor: "#f1f3f5" }}
          />
          <motion.div
            animate={{
              scale: hovered ? 1.1 : 1,
              backgroundColor: hovered ? "#1B6048" : "#FFFFFF",
            }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }}
          >
            <ArrowUpRightIcon
              size={18}
              color={hovered ? "#FFFFFF" : "#1B6048"}
              strokeWidth={2.5}
            />
          </motion.div>
        </div>
        <div>
          <Text fw={700} size="sm">
            {member.name}
          </Text>
          <Text fw={600} size="sm" c="dimmed">
            {member.role}
          </Text>
        </div>
      </Stack>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OurTeamPage() {
  const [selected, setSelected] = useState<TeamMember | null>(null);

  return (
    <Container size="lg" py={80}>
        <Stack align="center" gap="md" mb={60}>
            <Title order={1} ta="center" c="#1B6048" maw={800} size={45} style={{ lineHeight: 1.15 }}>
            Meet the Team
            </Title>
            <Text ta="center" c="dimmed" maw={520} mb={-5}>
            We build user-friendly, community-driven data
            tools that help Vermonters make sense of the challenges facing their
            state.
            </Text>
        </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl" verticalSpacing={40}>
        {TEAM.map((member) => (
          <TeamCard
            key={member.name}
            member={member}
            onSelect={() => setSelected(member)}
          />
        ))}
      </SimpleGrid>

      <Modal
        opened={selected !== null}
        onClose={() => setSelected(null)}
        size="xl"
        radius="md"
        title={null}
        centered
      >
        {selected && (
          <Group align="center" gap="xl" wrap="nowrap" p="xs" mt={-15}>
            <Image
              src={selected.image}
              alt={selected.name}
              radius="md"
              w={260}
              h={260}
              fit="cover"
              fallbackSrc="https://placehold.co/400x400?text=No+Image"
              style={{ flexShrink: 0, backgroundColor: "#f1f3f5" }}
            />
            <Stack gap="sm" style={{ flex: 1 }}>
              <div>
                <Text fw={700} size="xl">
                  {selected.name}
                </Text>
                <Text fw={600} size="md" c="#1B6048">
                  {selected.role}
                </Text>
              </div>
              <Text size="md" c="dimmed" style={{ lineHeight: 1.65 }}>
                {selected.bio}
              </Text>
            </Stack>
          </Group>
        )}
      </Modal>
    </Container>
  );
}