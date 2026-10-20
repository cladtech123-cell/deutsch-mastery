from fastapi import APIRouter

from app.core.security import CurrentUser, Session
from app.schemas.content import (
    AnswersIn, ExamDetail, ExamResult, ExamSummary, GrammarDetail, GrammarSummary, PlacementResultOut,
    ReadingDetail, ReadingSummary,
)
from app.services import catalog, exams

router = APIRouter()


@router.get("/grammar", response_model=list[GrammarSummary], tags=["grammar"])
async def grammar_list(user: CurrentUser, session: Session):
    return await catalog.grammar_list(session)


@router.get("/grammar/{topic_id}", response_model=GrammarDetail, tags=["grammar"])
async def grammar_detail(topic_id: str, user: CurrentUser, session: Session):
    return await catalog.grammar_detail(session, topic_id)


@router.get("/reading", response_model=list[ReadingSummary], tags=["reading"])
async def reading_list(user: CurrentUser, session: Session):
    return await catalog.reading_list(session)


@router.get("/reading/{text_id}", response_model=ReadingDetail, tags=["reading"])
async def reading_detail(text_id: str, user: CurrentUser, session: Session):
    return await catalog.reading_detail(session, text_id)


@router.get("/placement", response_model=ExamDetail, tags=["exams"])
async def placement(user: CurrentUser, session: Session):
    return await exams.placement_exam(session)


@router.post("/placement/submit", response_model=PlacementResultOut, tags=["exams"])
async def placement_submit(body: AnswersIn, user: CurrentUser, session: Session):
    return await exams.placement_submit(session, user, body.answers)


@router.get("/exams", response_model=list[ExamSummary], tags=["exams"])
async def exam_list(user: CurrentUser, session: Session):
    return await exams.list_exams(session, user)


@router.get("/exams/{exam_id}", response_model=ExamDetail, tags=["exams"])
async def exam_detail(exam_id: str, user: CurrentUser, session: Session):
    return await exams.detail(session, exam_id)


@router.post("/exams/{exam_id}/submit", response_model=ExamResult, tags=["exams"])
async def exam_submit(exam_id: str, body: AnswersIn, user: CurrentUser, session: Session):
    return await exams.submit(session, user, exam_id, body.answers)
