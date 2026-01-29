export class JobService {
    static getModifiers(_party: any[]) {
        // Todo: Iterate party members, check job_id, apply passives
        return {
            damageReduction: 1.0,
            chainRate: 1.0
        };
    }
}
